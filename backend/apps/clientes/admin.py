from django.contrib import admin

from .models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'correo', 'workshop', 'ciudad', 'estado', 'fecha_registro')
    list_filter = ('workshop', 'estado')
    search_fields = ('nombre', 'apellidos', 'correo')
