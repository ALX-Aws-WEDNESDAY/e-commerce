from rest_framework.permissions import BasePermission
from .models import Roles


class HasRole(BasePermission):
    # Allow access only if user has a specific role

    required_role = None

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if self.required_role is None:
            return True

        user_roles = Roles.objects.filter(user=request.user)
        return user_roles.filter(role__iexact=self.required_role).exists()


class IsAdmin(HasRole):
    """
    Allow access only for admin users
    """

    required_role = "admin"


class IsAgent(HasRole):
    """
    Allow access only for agent users
    """

    required_role = "agent"


class IsAdminOrAgent(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        user_roles = Roles.objects.filter(user=request.user)
        return user_roles.filter(role__in=["admin", "agent"]).exists()


class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        is_owner = obj.user == request.user
        user_roles = Roles.objects.filter(user=request.user)
        is_admin = user_roles.filter(role__iexact="admin").exists()
        return is_owner or is_admin
