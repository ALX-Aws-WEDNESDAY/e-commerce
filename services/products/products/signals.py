from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Product, Category
from django.core.cache import cache

@receiver([post_save, post_delete], sender=Category)
def clear_category_cache(sender, instance, **kwargs):
    print("Clearing category cache...")
    cache.delete_pattern("*category_list*")

@receiver([post_save, post_delete], sender=Product)
def clear_category_cache(sender, instance, **kwargs):
    print("Clearing category cache...")
    cache.delete_pattern("*product_list*")
