from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from .permissions import IsAdminOrReadOnly, IsAdminOrAgent
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from .models import Product, Category
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, ProductCreateUpdateSerializer,
    CategorySerializer, CategoryDetailSerializer
)

class StandardResultsSetPagination(PageNumberPagination):
    #Standard pagination for list views
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Category model
    - List: Everyone can view categories
    - Create/Update/Delete: Only admin/agent can perform
    - Retrieve: Everyone can view category details
    """
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CategoryDetailSerializer
        return CategorySerializer

    @method_decorator(cache_page(60 *60*12, key_prefix="category_list"))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrAgent])
    def toggle_active(self, request, pk=None):
        """Toggle category active status"""
        category = self.get_object()
        category.is_active = not category.is_active
        category.save()
        return Response({
            'status': 'success',
            'is_active': category.is_active
        })


class ProductViewSet(viewsets.ModelViewSet):
    """
        - List: Everyone can view published products
        - Create/Update/Delete: Only admin/agent can perform
        - Retrieve: Everyone can view published products, admin/agents can view all
    """
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'status', 'is_in_stock']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name', 'price']
    ordering = ['-created_at']

   
    def get_queryset(self):
        queryset = Product.objects.select_related('category')

        auth_data = getattr(self.request, 'auth', None) or {}
        roles = auth_data.get('roles', []) if self.request.user and auth_data else []
        if "admin" in roles or "agent" in roles:
            return queryset
        return queryset.filter(status='published')

    def get_serializer_class(self):
        """Use different serializers based on action"""
        if self.action == 'retrieve':
            return ProductDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductListSerializer
    
    @method_decorator(cache_page(60 * 60 * 12 , key_prefix="product_list"))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrAgent])
    def toggle_status(self, request, pk=None):
        """Toggle product status between published and draft"""
        product = self.get_object()
        current_status = product.status
        new_status = 'draft' if current_status == 'published' else 'published'
        product.status = new_status
        product.save()
        return Response({
            'status': 'success',
            'previous_status': current_status,
            'new_status': new_status
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrAgent])
    def update_stock(self, request, pk=None):
        #Update product stock quantity
        product = self.get_object()
        quantity = request.data.get('quantity')
        operation = request.data.get('operation', 'set')  # set, add, subtract

        if quantity is None:
            return Response(
                {'error': 'quantity is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            quantity = int(quantity)
        except (ValueError, TypeError):
            return Response(
                {'error': 'quantity must be an integer'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if operation == 'set':
            product.quantity_in_stock = quantity
        elif operation == 'add':
            product.quantity_in_stock += quantity
        elif operation == 'subtract':
            if product.quantity_in_stock - quantity < 0:
                return Response(
                    {'error': 'Cannot reduce stock below 0'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            product.quantity_in_stock -= quantity
        else:
            return Response(
                {'error': 'operation must be one of: set, add, subtract'},
                status=status.HTTP_400_BAD_REQUEST
            )

        product.is_in_stock = product.quantity_in_stock > 0
        product.save()

        return Response({
            'status': 'success',
            'quantity_in_stock': product.quantity_in_stock,
            'is_in_stock': product.is_in_stock
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrAgent])
    def admin_dashboard(self, request):
        """Dashboard stats for admin/agents"""
        total_products = Product.objects.count()
        published_products = Product.objects.filter(status='published').count()
        draft_products = Product.objects.filter(status='draft').count()
        archived_products = Product.objects.filter(status='archived').count()
        low_stock_products = Product.objects.filter(quantity_in_stock__lt=10, status='published').count()
        total_categories = Category.objects.count()

        return Response({
            'total_products': total_products,
            'published_products': published_products,
            'draft_products': draft_products,
            'archived_products': archived_products,
            'low_stock_products': low_stock_products,
            'total_categories': total_categories,
        })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def featured(self, request):
        """Get featured/promoted products"""
        featured_products = Product.objects.filter(
            status='published'
        ).order_by('-created_at')[:10]
        
        serializer = ProductListSerializer(featured_products, many=True)
        return Response(serializer.data)
