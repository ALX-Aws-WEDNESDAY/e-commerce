from django.contrib import admin
from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    # Admin configuration for Category model
    list_display = ("name", "is_active", "created_at", "products_count")
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        ("Basic Information", {"fields": ("name", "description")}),
        ("Status", {"fields": ("is_active",)}),
        (
            "Metadata",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def products_count(self, obj):
        # Display count of products in category
        return obj.products.count()

    products_count.short_description = "Products"


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    # Admin configuration for Product model
    list_display = (
        "name",
        "category",
        "price",
        "quantity_in_stock",
        "status",
        "is_in_stock",
        "created_by",
        "created_at",
    )
    list_filter = ("status", "category", "is_in_stock", "created_at")
    search_fields = ("name", "description")
    readonly_fields = ("created_by", "created_at", "updated_at", "profit_margin")
    filter_horizontal = ()

    fieldsets = (
        ("Basic Information", {"fields": ("name", "description")}),
        (
            "Pricing & Inventory",
            {
                "fields": (
                    "price",
                    "cost_price",
                    "profit_margin",
                    "quantity_in_stock",
                    "is_in_stock",
                )
            },
        ),
        ("Classification", {"fields": ("category", "status")}),
        ("Media", {"fields": ("image",)}),
        (
            "SEO",
            {"fields": ("meta_description", "meta_keywords"), "classes": ("collapse",)},
        ),
        (
            "Metadata",
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        # Set created_by on product creation
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def get_readonly_fields(self, request, obj=None):
        # Make created_by and timestamp readonly
        readonly = list(self.readonly_fields)
        if obj:  # Editing existing object
            readonly.extend(["created_by", "created_at", "updated_at"])
        return readonly
