from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.users.models import get_role


class MaterialPermission(BasePermission):
    """
    Leer: cualquier usuario con sesión.
    Crear, editar, ajustar y cambiar la foto: admin y maker.
    Eliminar: solo admin.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        role = get_role(user)
        # Quitar la foto de un material no es eliminar el material
        if request.method == 'DELETE' and getattr(view, 'action', None) != 'image':
            return role == 'admin'
        return role in ('admin', 'maker')
