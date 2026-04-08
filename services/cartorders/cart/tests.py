from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import Cart, CartItem


class CartModelTestCase(TestCase):
    """Test cases for Cart model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_cart_creation(self):
        """Test cart is created successfully"""
        self.assertIsNotNone(self.cart.id)
        self.assertEqual(self.cart.user, self.user)
        self.assertTrue(self.cart.is_active)

    def test_get_total_price_empty_cart(self):
        """Test total price of empty cart is zero"""
        self.assertEqual(self.cart.get_total_price(), 0)

    def test_get_total_quantity_empty_cart(self):
        """Test total quantity of empty cart is zero"""
        self.assertEqual(self.cart.get_total_quantity(), 0)

    def test_get_item_count(self):
        """Test item count"""
        self.assertEqual(self.cart.get_item_count(), 0)
        CartItem.objects.create(
            cart=self.cart,
            product_id=1,
            product_name='Test Product',
            product_price=10.00,
            quantity=2
        )
        self.assertEqual(self.cart.get_item_count(), 1)


class CartItemModelTestCase(TestCase):
    """Test cases for CartItem model"""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.cart = Cart.objects.create(user=self.user)

    def test_cart_item_creation(self):
        """Test cart item creation"""
        item = CartItem.objects.create(
            cart=self.cart,
            product_id=1,
            product_name='Test Product',
            product_price=10.00,
            quantity=2
        )
        self.assertEqual(item.product_id, 1)
        self.assertEqual(item.get_item_total(), 20.00)

    def test_duplicate_product_in_cart(self):
        """Test that duplicate products can't be added (unique_together constraint)"""
        CartItem.objects.create(
            cart=self.cart,
            product_id=1,
            product_name='Test Product',
            product_price=10.00,
            quantity=2
        )
        with self.assertRaises(Exception):
            CartItem.objects.create(
                cart=self.cart,
                product_id=1,
                product_name='Test Product',
                product_price=10.00,
                quantity=1
            )


class CartAPITestCase(TestCase):
    """Test cases for Cart API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

    def test_get_current_cart(self):
        """Test getting current user's cart"""
        response = self.client.get('/api/cart/current/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('items', response.data)
        self.assertEqual(response.data['user'], self.user.id)

    def test_add_item_to_cart(self):
        """Test adding item to cart"""
        data = {
            'product_id': 1,
            'product_name': 'Test Product',
            'product_price': '29.99',
            'quantity': 2
        }
        response = self.client.post('/api/cart/add_item/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['quantity'], 2)

    def test_remove_item_from_cart(self):
        """Test removing item from cart"""
        CartItem.objects.create(
            cart=Cart.objects.get(user=self.user),
            product_id=1,
            product_name='Test Product',
            product_price=10.00,
            quantity=2
        )
        response = self.client.delete('/api/cart/remove_item/1/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_clear_cart(self):
        """Test clearing entire cart"""
        response = self.client.post('/api/cart/clear/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cart_summary(self):
        """Test cart summary endpoint"""
        response = self.client.get('/api/cart/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_items', response.data)
        self.assertIn('total_price', response.data)
