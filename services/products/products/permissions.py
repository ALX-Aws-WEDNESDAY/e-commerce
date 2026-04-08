from rest_framework import permissions


def has_role(request, allowed_roles):
    if not request.auth:
        return False

    roles = request.auth.get("roles", [])
    return any(role in allowed_roles for role in roles)


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    - Everyone: Read access
    - Admin/Agent: Write access
    """

    def has_permission(self, request, view):
        # Allow read-only
        if request.method in permissions.SAFE_METHODS:
            return True

        return has_role(request, ["admin", "agent"])

    def has_object_permission(self, request, view, obj):
        # Allow read-only
        if request.method in permissions.SAFE_METHODS:
            return True

        return has_role(request, ["admin", "agent"])


class IsAdminOrAgent(permissions.BasePermission):
    # Only admin or agent can access
    def has_permission(self, request, view):
        return has_role(request, ["admin", "agent"])
