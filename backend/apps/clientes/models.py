from django.db import models


class Cliente(models.Model):
    class Estado(models.TextChoices):
        ACTIVO = 'active', 'Activo'
        INACTIVO = 'inactive', 'Inactivo'

    workshop = models.ForeignKey(
        'users.Workshop', on_delete=models.CASCADE, related_name='clientes'
    )
    nombre = models.CharField(max_length=150)
    apellidos = models.CharField(max_length=150, blank=True, default='')
    correo = models.EmailField()
    telefono = models.CharField(max_length=30, blank=True, null=True)
    ciudad = models.CharField(max_length=100, blank=True, default='')
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.ACTIVO)
    direccion = models.TextField(blank=True, null=True)
    notas = models.TextField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # El mismo correo puede existir en talleres distintos, pero no repetido en uno
            models.UniqueConstraint(fields=['workshop', 'correo'], name='cliente_correo_unico_por_taller'),
        ]

    def __str__(self):
        return f"{self.nombre} {self.apellidos}".strip()
