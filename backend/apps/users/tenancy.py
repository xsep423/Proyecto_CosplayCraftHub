"""
Aislamiento multi-tenant (base de datos compartida, columna `workshop`).

Reglas de seguridad:
1. El taller SIEMPRE se obtiene del usuario autenticado (Profile.workshop),
   nunca de un parámetro, header o campo que mande el cliente.
2. Toda consulta de un ViewSet se filtra por ese taller (get_queryset), así que
   un id de otro taller responde 404, como si no existiera.
3. Al crear, el taller se asigna en el servidor (perform_create); si el cliente
   manda un "workshop" en el JSON se ignora.
4. Las relaciones (cliente de una cotización, material de un proyecto, etc.)
   solo aceptan objetos del mismo taller (TenantPrimaryKeyRelatedField).
"""
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from .models import get_profile


def get_workshop(user):
    """Taller del usuario autenticado. Lanza 403 si no tiene uno activo."""
    if not (user and user.is_authenticated):
        raise PermissionDenied('Sesión no válida.')
    workshop = get_profile(user).workshop
    if workshop is None:
        raise PermissionDenied('Tu usuario no pertenece a ningún taller.')
    if not workshop.is_active:
        raise PermissionDenied('El taller está desactivado.')
    return workshop


class TenantScopedMixin:
    """
    Mixin para ViewSets. `tenant_field` es la ruta al taller desde el modelo
    (por ejemplo 'workshop' o 'project__workshop').
    """
    tenant_field = 'workshop'

    @property
    def workshop(self):
        if not hasattr(self, '_workshop'):
            self._workshop = get_workshop(self.request.user)
        return self._workshop

    def get_queryset(self):
        return super().get_queryset().filter(**{self.tenant_field: self.workshop})

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request and self.request.user.is_authenticated:
            context['workshop'] = self.workshop
        return context

    def perform_create(self, serializer):
        if self.tenant_field == 'workshop':
            serializer.save(workshop=self.workshop)
        else:
            serializer.save()


class TenantPrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """
    PrimaryKeyRelatedField que solo acepta objetos del taller del usuario.
    Uso: TenantPrimaryKeyRelatedField(queryset=Cliente.objects.all())
         TenantPrimaryKeyRelatedField(queryset=Task.objects.all(), tenant_field='project__workshop')
    """

    def __init__(self, tenant_field='workshop', **kwargs):
        self.tenant_field = tenant_field
        super().__init__(**kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        workshop = self.context.get('workshop')
        if workshop is None:
            return queryset.none()
        return queryset.filter(**{self.tenant_field: workshop})
