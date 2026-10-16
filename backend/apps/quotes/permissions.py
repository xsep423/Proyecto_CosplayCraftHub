from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.users.models import get_role


class QuotePermission(BasePermission):
    """
    Leer: cualquier usuario con sesión.
    Crear, editar y cambiar estado: admin y maker.
    Eliminar: solo admin.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        role = get_role(user)
        if request.method == 'DELETE':
            return role == 'admin'
        return role in ('admin', 'maker')
