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


class Workshop(models.Model):
    """Un solo registro (pk=1) con los datos del negocio."""
    name = models.CharField(max_length=150, blank=True)
    owner = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    city = models.CharField(max_length=100, blank=True)
    address = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    currency = models.CharField(max_length=3, default='MXN')
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=16)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.name or 'Taller'
