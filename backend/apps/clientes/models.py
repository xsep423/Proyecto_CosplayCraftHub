from django.db import models

# Medidas corporales en centímetros (la talla de calzado es talla MX).
# El orden es el que se muestra en la ficha del cliente.
MEDIDAS = [
    ('altura', 'Altura'),
    ('cabeza', 'Contorno de cabeza'),
    ('cuello', 'Cuello'),
    ('hombros', 'Ancho de hombros'),
    ('busto', 'Busto / pecho'),
    ('bajo_busto', 'Bajo busto'),
    ('cintura', 'Cintura'),
    ('cadera', 'Cadera'),
    ('largo_espalda', 'Largo de espalda'),
    ('largo_brazo', 'Largo de brazo'),
    ('biceps', 'Contorno de bíceps'),
    ('muneca', 'Muñeca'),
    ('entrepierna', 'Entrepierna'),
    ('muslo', 'Muslo'),
    ('pantorrilla', 'Pantorrilla'),
    ('calzado', 'Talla de calzado'),
]
MEDIDAS_KEYS = [k for k, _ in MEDIDAS]


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
    # Medidas para confeccionar trajes; se reutilizan en todos sus proyectos
    medidas = models.JSONField(default=dict, blank=True)
    medidas_notas = models.TextField(blank=True, default='')
    medidas_actualizadas = models.DateTimeField(null=True, blank=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # El mismo correo puede existir en talleres distintos, pero no repetido en uno
            models.UniqueConstraint(fields=['workshop', 'correo'], name='cliente_correo_unico_por_taller'),
        ]

    def __str__(self):
        return f"{self.nombre} {self.apellidos}".strip()
