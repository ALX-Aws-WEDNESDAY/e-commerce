from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db.models import F, Sum
from decimal import Decimal


class Cart(models.Model):
    """
    Shopping cart model for storing user's cart items
    """
    user = models.IntegerField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Cart'
        verbose_name_plural = 'Carts'

    def __str__(self):
        return f"Cart for {self.user.username}"

    def get_total_price(self):
        """Calculate total price of all items in cart"""
        total = self.items.aggregate(
            total=Sum(F('product_price') * F('quantity'), output_field=models.DecimalField())
        )['total']
        return total or Decimal('0.00')

    def get_total_quantity(self):
        """Get total quantity of items in cart"""
        total = self.items.aggregate(total=Sum('quantity'))['total']
        return total or 0

    def get_item_count(self):
        """Get number of unique items in cart"""
        return self.items.count()

    def clear_cart(self):
        """Remove all items from cart"""
        self.items.all().delete()


class CartItem(models.Model):
    """
    Individual item in a shopping cart
    """
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product_id = models.IntegerField(
        help_text="Product ID from product microservice"
    )
    product_name = models.CharField(max_length=255)
    product_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['cart', 'product_id']
        ordering = ['-created_at']
        verbose_name = 'Cart Item'
        verbose_name_plural = 'Cart Items'

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"

    def get_item_total(self):
        """Calculate total for this item"""
        return self.product_price * self.quantity
