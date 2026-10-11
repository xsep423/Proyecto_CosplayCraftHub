# apps/users/models.py
from django.conf import settings
from django.db import models


class Profile(models.Model):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrador'
        MAKER = 'maker', 'Maker'
        VIEWER = 'viewer', 'Visualizador'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)

    def __str__(self):
        return f'{self.user.username} ({self.role})'


def get_role(user):
    """Devuelve el rol del usuario; crea el perfil si aún no existe."""
    profile, _ = Profile.objects.get_or_create(
        user=user,
        defaults={'role': 'admin' if user.is_superuser else 'viewer'},
    )
    return profile.role
