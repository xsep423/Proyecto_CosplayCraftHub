from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.db.models import Count

from .models import Profile, Workshop


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    extra = 1          # muestra el formulario aunque el perfil no exista aún
    max_num = 1
    verbose_name_plural = 'Rol'


class UserAdmin(BaseUserAdmin):
    inlines = [ProfileInline]
    list_display = ('username', 'email', 'get_workshop', 'get_role', 'is_active', 'is_staff')
    list_filter = ('profile__workshop', 'is_active')

    @admin.display(description='Taller')
    def get_workshop(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.workshop if profile and profile.workshop else '—'

    # Pide el correo al crear el usuario
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
    )

    @admin.display(description='Rol')
    def get_role(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.role if profile else '—'


@admin.register(Workshop)
class WorkshopAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'owner', 'city', 'is_active',
        'num_usuarios', 'num_clientes', 'num_proyectos', 'num_cotizaciones', 'created_at',
    )
    list_filter = ('is_active',)
    search_fields = ('name', 'owner', 'email')
    list_editable = ('is_active',)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _usuarios=Count('members', distinct=True),
            _clientes=Count('clientes', distinct=True),
            _proyectos=Count('projects', distinct=True),
            _cotizaciones=Count('quotes', distinct=True),
        )

    @admin.display(description='Usuarios', ordering='_usuarios')
    def num_usuarios(self, obj):
        return obj._usuarios

    @admin.display(description='Clientes', ordering='_clientes')
    def num_clientes(self, obj):
        return obj._clientes

    @admin.display(description='Proyectos', ordering='_proyectos')
    def num_proyectos(self, obj):
        return obj._proyectos

    @admin.display(description='Cotizaciones', ordering='_cotizaciones')
    def num_cotizaciones(self, obj):
        return obj._cotizaciones

    fieldsets = (
        ('Perfil del taller', {
            'fields': ('name', 'slug', 'owner', 'email', 'phone', 'city', 'address', 'bio', 'is_active'),
        }),
        ('Configuración financiera', {
            'fields': ('currency', 'tax_rate', 'quote_prefix'),
        }),
    )


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# Panel de super administración de la plataforma (todos los talleres)
admin.site.site_header = 'CosplayCraft Hub · Super administración'
admin.site.site_title = 'CosplayCraft Hub'
admin.site.index_title = 'Todos los talleres (tenants) de la plataforma'
