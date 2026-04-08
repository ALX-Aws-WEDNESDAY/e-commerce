from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Cart, CartItem
from .serializers import (
    CartSerializer,
    CartItemSerializer,
    CartItemCreateUpdateSerializer,
    CartDetailSerializer,
)


class CartViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing shopping carts

    Endpoints:
    - GET /api/cart/ - Get current user's cart
    - POST /api/cart/add-item/ - Add item to cart
    - PATCH /api/cart/update-item/{id}/ - Update cart item quantity
    - DELETE /api/cart/remove-item/{id}/ - Remove item from cart
    - POST /api/cart/clear/ - Clear entire cart
    """

    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own cart"""
        return Cart.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def current(self, request):
        """Get current user's cart"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        serializer = CartDetailSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def add_item(self, request):
        """Add item to cart"""
        cart, created = Cart.objects.get_or_create(user=request.user)

        serializer = CartItemCreateUpdateSerializer(data=request.data)
        if serializer.is_valid():
            product_id = serializer.validated_data.get("product_id")
            quantity = serializer.validated_data.get("quantity", 1)

            # Update existing item or create new one
            item, item_created = CartItem.objects.get_or_create(
                cart=cart,
                product_id=product_id,
                defaults={
                    "product_name": serializer.validated_data.get("product_name"),
                    "product_price": serializer.validated_data.get("product_price"),
                    "quantity": quantity,
                },
            )

            if not item_created:
                # If item already exists, add to its quantity
                item.quantity += quantity
                item.save()

            return Response(
                CartItemSerializer(item).data, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=False,
        methods=["put", "patch"],
        url_path="update-item/(?P<product_id>[^/.]+)",
    )
    def update_item(self, request, product_id=None):
        """Update quantity of item in cart"""
        cart = get_object_or_404(Cart, user=request.user)
        item = get_object_or_404(CartItem, cart=cart, product_id=product_id)

        serializer = CartItemCreateUpdateSerializer(data=request.data, partial=True)
        if serializer.is_valid():
            quantity = serializer.validated_data.get("quantity")
            if quantity:
                item.quantity = quantity
                item.save()
            return Response(CartItemSerializer(item).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=False, methods=["delete"], url_path="remove-item/(?P<product_id>[^/.]+)"
    )
    def remove_item(self, request, product_id=None):
        """Remove item from cart"""
        cart = get_object_or_404(Cart, user=request.user)
        item = get_object_or_404(CartItem, cart=cart, product_id=product_id)
        item.delete()
        return Response(
            {"message": "Item removed from cart"}, status=status.HTTP_204_NO_CONTENT
        )

    @action(detail=False, methods=["post"])
    def clear(self, request):
        """Clear all items from cart"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        cart.clear_cart()
        return Response(
            {"message": "Cart cleared successfully"}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get cart summary"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        return Response(
            {
                "total_items": cart.get_item_count(),
                "total_quantity": cart.get_total_quantity(),
                "total_price": cart.get_total_price(),
                "is_empty": cart.items.count() == 0,
            }
        )
