from rest_framework.permissions import BasePermission

from apps.users.serializers import is_platform_admin


class IsPlatformAdmin(BasePermission):
    """
    Solo el super admin de la plataforma (superusuario sin taller).
    Se revisa contra la base de datos en cada petición, no contra el token.
    Los admins de taller reciben 403 aunque alteren su token.
    """
    message = 'Solo el super administrador de la plataforma puede usar la consola.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and is_platform_admin(user))
