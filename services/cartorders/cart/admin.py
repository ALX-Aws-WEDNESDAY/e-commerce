from django.contrib import admin
from .models import Cart, CartItem


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "get_item_count",
        "get_total_price",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_active", "created_at", "updated_at"]
    search_fields = ["user__username", "user__email"]
    readonly_fields = ["created_at", "updated_at", "user"]
    fieldsets = (
        ("User", {"fields": ("user",)}),
        ("Status", {"fields": ("is_active",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_item_count(self, obj):
        return obj.get_item_count()

    get_item_count.short_description = "Items"

    def get_total_price(self, obj):
        return f"${obj.get_total_price()}"

    get_total_price.short_description = "Total Price"


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "product_name",
        "cart",
        "quantity",
        "product_price",
        "get_item_total",
        "created_at",
    ]
    list_filter = ["created_at", "updated_at", "cart__user"]
    search_fields = ["product_name", "cart__user__username", "product_id"]
    readonly_fields = ["created_at", "updated_at", "get_item_total"]
    fieldsets = (
        ("Cart", {"fields": ("cart",)}),
        (
            "Product Information",
            {"fields": ("product_id", "product_name", "product_price")},
        ),
        ("Quantity", {"fields": ("quantity",)}),
        ("Total", {"fields": ("get_item_total",), "classes": ("collapse",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_item_total(self, obj):
        return f"${obj.get_item_total()}"

    get_item_total.short_description = "Item Total"
