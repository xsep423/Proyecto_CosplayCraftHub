from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import Profile, Workshop


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    extra = 1          # muestra el formulario aunque el perfil no exista aún
    max_num = 1
    verbose_name_plural = 'Rol'


class UserAdmin(BaseUserAdmin):
    inlines = [ProfileInline]
    list_display = ('username', 'email', 'get_role', 'is_active', 'is_staff')

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
    list_display = ('name', 'owner', 'email', 'phone', 'city', 'currency', 'tax_rate')

    fieldsets = (
        ('Perfil del taller', {
            'fields': ('name', 'owner', 'email', 'phone', 'city', 'address', 'bio'),
        }),
        ('Configuración financiera', {
            'fields': ('currency', 'tax_rate'),
        }),
    )

    def has_add_permission(self, request):
        # Solo puede existir un taller
        return not Workshop.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False



admin.site.unregister(User)
admin.site.register(User, UserAdmin)
