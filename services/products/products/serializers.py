from rest_framework import serializers
from .models import Product, Category


class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'description',
            'is_active', 'products_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_products_count(self, obj):
        return obj.products.filter(status='published').count()


class CategoryDetailSerializer(CategorySerializer):
    #Detailed serializer for Category with full product information
    products = serializers.SerializerMethodField()

    class Meta(CategorySerializer.Meta):
        fields = CategorySerializer.Meta.fields + ['products']

    def get_products(self, obj):
        #Return published products for public view, all for admin
        products = obj.products.all()
        request = self.context.get('request')
        
        # Show only published products for non-admin users
        if request and not self.is_admin(request):
            products = products.filter(status='published')
        
        return ProductListSerializer(products, many=True).data

    def is_admin(self, request):
        """Check if user is admin or agent"""
        return request.auth and any(role in ["admin", "agent"] for role in request.auth.get("roles", []))


class ProductListSerializer(serializers.ModelSerializer):
    #Serializer for Product list view
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_id = serializers.CharField(source='created_by', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'category',
            'category_name', 'quantity_in_stock', 'is_in_stock', 'image',
            'status', 'created_by_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'category_name', 'created_by_username']


class ProductDetailSerializer(serializers.ModelSerializer):
    #Detailed serializer for Product detail view
    category_name = serializers.CharField(source='category.name', read_only=True)
    profit_margin = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'cost_price',
            'category', 'category_name', 'quantity_in_stock', 'is_in_stock', 'image', 'status', 'created_by', 'meta_description', 'meta_keywords', 'profit_margin',  'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'category_name']

    def get_profit_margin(self, obj):
        return obj.profit_margin


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    #Serializer for creating and updating products
    
    class Meta:
        model = Product
        fields = [
            'name', 'description', 'price', 'cost_price',
            'category', 'quantity_in_stock', 'is_in_stock', 'image',
            'status', 'meta_description', 'meta_keywords'
        ]


    def validate(self, data):
        #Validate price and cost_price relationship
        price = data.get('price')
        cost_price = data.get('cost_price') or getattr(self.instance, 'cost_price', None)
        
        if cost_price and price and cost_price > price:
            raise serializers.ValidationError(
                "Cost price cannot be higher than selling price."
            )
        
        return data

    def create(self, validated_data):
        #Create product and set created_by to current user
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user.get('user_id') 
        return super().create(validated_data)
