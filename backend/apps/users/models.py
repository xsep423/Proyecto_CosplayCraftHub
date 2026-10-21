# apps/users/models.py
from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Workshop(models.Model):
    """
    Un taller = un tenant. Todos los datos del negocio (clientes, materiales,
    proyectos, cotizaciones) cuelgan de un Workshop.
    """
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True)
    owner = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    city = models.CharField(max_length=100, blank=True)
    address = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    currency = models.CharField(max_length=3, default='MXN')
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=16)
    quote_prefix = models.CharField(max_length=10, default='CCH')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or 'taller'
            slug, n = base, 2
            while Workshop.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug, n = f'{base}-{n}', n + 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name or 'Taller'


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
    # Taller al que pertenece el usuario. Un usuario sin taller no puede usar la API.
    workshop = models.ForeignKey(
        Workshop,
        on_delete=models.CASCADE,
        related_name='members',
        null=True,
        blank=True,
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)

    def __str__(self):
        return f'{self.user.username} ({self.role})'


def get_profile(user):
    profile, _ = Profile.objects.select_related('workshop').get_or_create(
        user=user,
        defaults={'role': 'admin' if user.is_superuser else 'viewer'},
    )
    return profile


def get_role(user):
    """Devuelve el rol del usuario; crea el perfil si aún no existe."""
    return get_profile(user).role
