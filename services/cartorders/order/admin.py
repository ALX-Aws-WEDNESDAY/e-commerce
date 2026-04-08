from django.contrib import admin
from .models import Order, OrderItem, OrderTracking


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ['product_id', 'product_name', 'product_price', 'quantity', 'line_total']
    readonly_fields = ['product_id', 'product_name', 'product_price', 'quantity', 'line_total', 'created_at']
    can_delete = False


class OrderTrackingInline(admin.TabularInline):
    model = OrderTracking
    extra = 0
    fields = ['status', 'message', 'created_at']
    readonly_fields = ['status', 'message', 'created_at']
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user', 'status', 'total_price', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at', 'updated_at', 'user']
    search_fields = ['order_number', 'user__username', 'user__email', 'shipping_address']
    readonly_fields = ['order_number', 'user', 'created_at', 'updated_at', 'shipped_at', 'delivered_at']
    inlines = [OrderItemInline, OrderTrackingInline]
    
    fieldsets = (
        ('Order Information', {
            'fields': ('order_number', 'user', 'status')
        }),
        ('Pricing', {
            'fields': ('subtotal', 'tax', 'shipping_cost', 'discount', 'total_price')
        }),
        ('Addresses', {
            'fields': ('shipping_address', 'billing_address', 'phone_number')
        }),
        ('Shipping', {
            'fields': ('tracking_number', 'shipped_at', 'delivered_at')
        }),
        ('Additional Information', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing existing object
            return self.readonly_fields + ['subtotal', 'tax', 'shipping_cost', 'discount', 'total_price']
        return self.readonly_fields


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'product_name', 'quantity', 'product_price', 'line_total', 'created_at']
    list_filter = ['created_at', 'order__user', 'order__status']
    search_fields = ['product_name', 'order__order_number', 'product_id']
    readonly_fields = ['order', 'product_id', 'product_name', 'product_price', 'quantity', 'line_total', 'created_at']
    can_delete = False

    def has_add_permission(self, request):
        return False


@admin.register(OrderTracking)
class OrderTrackingAdmin(admin.ModelAdmin):
    list_display = ['order', 'status', 'created_at']
    list_filter = ['status', 'created_at', 'order__user']
    search_fields = ['order__order_number', 'message']
    readonly_fields = ['order', 'status', 'message', 'created_at']
    can_delete = False

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
