from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import Profile


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


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
