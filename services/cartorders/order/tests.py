from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from .models import Order, OrderItem, OrderTracking


class OrderModelTestCase(TestCase):
    """Test cases for Order model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_order_creation(self):
        """Test order is created successfully"""
        order = Order.objects.create(
            user=self.user,
            order_number='ORD-20240101-ABC123',
            shipping_address='123 Main St',
            billing_address='123 Main St',
            phone_number='+1234567890',
            subtotal=100.00,
            total_price=110.00
        )
        self.assertEqual(order.order_number, 'ORD-20240101-ABC123')
        self.assertEqual(order.status, 'pending')

    def test_order_status_choices(self):
        """Test order status field choices"""
        statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
        for status_value in statuses:
            order = Order.objects.create(
                user=self.user,
                order_number=f'ORD-{status_value}',
                status=status_value,
                shipping_address='123 Main St',
                billing_address='123 Main St',
                phone_number='+1234567890'
            )
            self.assertEqual(order.status, status_value)

    def test_calculate_total(self):
        """Test total price calculation"""
        order = Order.objects.create(
            user=self.user,
            order_number='ORD-20240101-ABC123',
            shipping_address='123 Main St',
            billing_address='123 Main St',
            phone_number='+1234567890',
            subtotal=100.00,
            tax=10.00,
            shipping_cost=5.00,
            discount=5.00
        )
        total = order.calculate_total()
        self.assertEqual(total, 110.00)


class OrderItemModelTestCase(TestCase):
    """Test cases for OrderItem model"""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.order = Order.objects.create(
            user=self.user,
            order_number='ORD-20240101-ABC123',
            shipping_address='123 Main St',
            billing_address='123 Main St',
            phone_number='+1234567890'
        )

    def test_order_item_creation(self):
        """Test order item creation"""
        item = OrderItem.objects.create(
            order=self.order,
            product_id=1,
            product_name='Test Product',
            product_price=10.00,
            quantity=2,
            line_total=20.00
        )
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.line_total, 20.00)


class OrderTrackingModelTestCase(TestCase):
    """Test cases for OrderTracking model"""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.order = Order.objects.create(
            user=self.user,
            order_number='ORD-20240101-ABC123',
            shipping_address='123 Main St',
            billing_address='123 Main St',
            phone_number='+1234567890'
        )

    def test_tracking_creation(self):
        """Test order tracking creation"""
        tracking = OrderTracking.objects.create(
            order=self.order,
            status='pending',
            message='Order created'
        )
        self.assertEqual(tracking.status, 'pending')
        self.assertEqual(tracking.message, 'Order created')


class OrderAPITestCase(TestCase):
    """Test cases for Order API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

    def test_list_orders(self):
        """Test listing user's orders"""
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_create_order(self):
        """Test creating an order"""
        data = {
            'shipping_address': '123 Main St, City, State 12345',
            'billing_address': '123 Main St, City, State 12345',
            'phone_number': '+1234567890',
            'notes': 'Please deliver after 2 PM'
        }
        response = self.client.post('/api/orders/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('order_number', response.data)

    def test_get_order_details(self):
        """Test getting order details"""
        order = Order.objects.create(
            user=self.user,
            order_number='ORD-20240101-ABC123',
            shipping_address='123 Main St',
            billing_address='123 Main St',
            phone_number='+1234567890'
        )
        response = self.client.get(f'/api/orders/{order.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['order_number'], 'ORD-20240101-ABC123')

    def test_cancel_order(self):
        """Test cancelling an order"""
        order = Order.objects.create(
            user=self.user,
            order_number='ORD-20240101-ABC123',
            status='pending',
            shipping_address='123 Main St',
            billing_address='123 Main St',
            phone_number='+1234567890'
        )
        response = self.client.post(f'/api/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')

    def test_get_order_tracking(self):
        """Test getting order tracking history"""
        order = Order.objects.create(
            user=self.user,
            order_number='ORD-20240101-ABC123',
            shipping_address='123 Main St',
            billing_address='123 Main St',
            phone_number='+1234567890'
        )
        OrderTracking.objects.create(
            order=order,
            status='pending',
            message='Order created'
        )
        response = self.client.get(f'/api/orders/{order.id}/tracking/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_order_summary(self):
        """Test order summary endpoint"""
        response = self.client.get('/api/orders/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_orders', response.data)
