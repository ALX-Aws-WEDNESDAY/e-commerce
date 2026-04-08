from django.db.models.signals import post_save
from django.dispatch import receiver
from users.models import User, Roles


@receiver(post_save, sender=User)
def assign_admin_role(sender, instance, created, **kwargs):
    if instance.is_superuser:
        Roles.objects.get_or_create(user=instance, role="admin")
