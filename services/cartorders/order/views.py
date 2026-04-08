from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.utils import timezone
import uuid
from .models import Order, OrderItem, OrderTracking
from .serializers import (
    OrderDetailSerializer,
    OrderListSerializer,
    OrderCreateSerializer,
    OrderUpdateSerializer,
    OrderTrackingSerializer,
)


class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing orders
    
    Endpoints:
    - GET /api/orders/ - List user's orders
    - POST /api/orders/ - Create new order
    - GET /api/orders/{id}/ - Get order details
    - PUT /api/orders/{id}/ - Update order
    - POST /api/orders/{id}/cancel/ - Cancel order
    - GET /api/orders/{id}/tracking/ - Get order tracking history
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'created_at']
    search_fields = ['order_number', 'shipping_address']
    ordering_fields = ['created_at', 'total_price', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        """Users can only see their own orders"""
        return Order.objects.filter(user=self.request.user).prefetch_related('items', 'tracking_history')

    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return OrderListSerializer
        elif self.action == 'create':
            return OrderCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return OrderUpdateSerializer
        elif self.action == 'tracking':
            return OrderTrackingSerializer
        return OrderDetailSerializer

    def perform_create(self, serializer):
        """Create order with current user and generate order number"""
        # Generate unique order number
        order_number = f"ORD-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        
        order = serializer.save(
            user=self.request.user,
            order_number=order_number,
        )
        
        # Create initial tracking entry
        OrderTracking.objects.create(
            order=order,
            status='pending',
            message='Order created and awaiting confirmation'
        )

    def create(self, request, *args, **kwargs):
        """Override create to return detailed order"""
        response = super().create(request, *args, **kwargs)
        # Fetch the created order and return detailed serializer
        order = Order.objects.get(order_number=response.data.get('order_number'))
        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, *args, **kwargs):
        """Use detail serializer for retrieve"""
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an order (only if pending or confirmed)"""
        order = self.get_object()
        
        if order.status not in ['pending', 'confirmed']:
            return Response(
                {'error': f'Cannot cancel order with status {order.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'cancelled'
        order.save()
        
        # Add tracking entry
        OrderTracking.objects.create(
            order=order,
            status='cancelled',
            message='Order cancelled by user'
        )
        
        return Response(
            {'message': 'Order cancelled successfully'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'])
    def tracking(self, request, pk=None):
        """Get order tracking history"""
        order = self.get_object()
        tracking_history = order.tracking_history.all()
        serializer = OrderTrackingSerializer(tracking_history, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get user's 5 most recent orders"""
        recent_orders = Order.objects.filter(
            user=request.user
        ).prefetch_related('items')[:5]
        serializer = OrderListSerializer(recent_orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get user's order summary statistics"""
        orders = Order.objects.filter(user=request.user)
        
        stats = {
            'total_orders': orders.count(),
            'pending_orders': orders.filter(status='pending').count(),
            'confirmed_orders': orders.filter(status='confirmed').count(),
            'processing_orders': orders.filter(status='processing').count(),
            'shipped_orders': orders.filter(status='shipped').count(),
            'delivered_orders': orders.filter(status='delivered').count(),
            'cancelled_orders': orders.filter(status='cancelled').count(),
            'total_spent': sum(order.total_price for order in orders),
        }
        return Response(stats)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update order status (admin/staff only in production)"""
        order = self.get_object()
        new_status = request.data.get('status')
        message = request.data.get('message', '')
        
        valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = order.status
        order.status = new_status
        
        # Update timestamps based on status
        if new_status == 'shipped' and not order.shipped_at:
            order.shipped_at = timezone.now()
        elif new_status == 'delivered' and not order.delivered_at:
            order.delivered_at = timezone.now()
        
        order.save()
        
        # Add tracking entry
        tracking_message = message or f'Order status changed from {old_status} to {new_status}'
        OrderTracking.objects.create(
            order=order,
            status=new_status,
            message=tracking_message
        )
        
        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_200_OK
        )
