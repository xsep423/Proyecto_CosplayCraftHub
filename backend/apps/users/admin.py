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
    list_display = ('name', 'slug', 'owner', 'email', 'city', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'owner', 'email')

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
