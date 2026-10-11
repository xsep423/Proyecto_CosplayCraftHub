# apps/users/permissions.py
from rest_framework.permissions import BasePermission
from .models import get_role


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and get_role(user) == 'admin')
