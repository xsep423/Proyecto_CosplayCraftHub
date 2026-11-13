from decimal import Decimal

from django.conf import settings
from django.db import models


class Project(models.Model):
    class Status(models.TextChoices):
        PLANNING = 'planning', 'Planificación'
        IN_PROGRESS = 'in_progress', 'En Proceso'
        REVIEW = 'review', 'Revisión'
        COMPLETED = 'completed', 'Completado'
        ON_HOLD = 'on_hold', 'En Pausa'

    class Priority(models.TextChoices):
        LOW = 'low', 'Baja'
        MEDIUM = 'medium', 'Media'
        HIGH = 'high', 'Alta'
        URGENT = 'urgent', 'Urgente'

    workshop = models.ForeignKey(
        'users.Workshop', on_delete=models.CASCADE, related_name='projects'
    )
    client = models.ForeignKey(
        'clientes.Cliente', on_delete=models.PROTECT, related_name='projects'
    )
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='projects',
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PLANNING)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    start_date = models.DateField()
    due_date = models.DateField()
    budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Costos que no salen del inventario
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tags = models.JSONField(default=list, blank=True)
    # Se muestra en el portafolio público del taller (si el taller lo tiene activo)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', 'id']

    @property
    def materials_cost(self):
        return sum(
            (m.quantity * m.unit_cost for m in self.project_materials.all()),
            Decimal('0'),
        )

    @property
    def spent(self):
        return self.materials_cost + self.labor_cost + self.other_cost

    @property
    def progress(self):
        """% de tareas terminadas. Un proyecto completado siempre es 100%."""
        if self.status == self.Status.COMPLETED:
            return 100
        tasks = list(self.tasks.all())
        if not tasks:
            return 0
        done = sum(1 for t in tasks if t.status == Task.Status.DONE)
        return round(done * 100 / len(tasks))

    def __str__(self):
        return self.name


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = 'todo', 'Por Hacer'
        IN_PROGRESS = 'in_progress', 'En Proceso'
        REVIEW = 'review', 'Revisión'
        DONE = 'done', 'Listo'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(
        max_length=10, choices=Project.Priority.choices, default=Project.Priority.MEDIUM
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
    )
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.title


class ProjectMaterial(models.Model):
    """Material del inventario usado en un proyecto (descuenta existencias)."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='project_materials')
    material = models.ForeignKey(
        'inventory.Material', on_delete=models.PROTECT, related_name='project_uses'
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    # Costo unitario al momento de usarlo (si cambia en inventario, el proyecto no se altera)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']

    @property
    def subtotal(self):
        return self.quantity * self.unit_cost

    def __str__(self):
        return f'{self.material.name} × {self.quantity}'


class ProjectPhoto(models.Model):
    """Foto de un proyecto: referencia, avance o resultado final."""

    class Stage(models.TextChoices):
        REFERENCE = 'reference', 'Referencia'
        PROGRESS = 'progress', 'Avance'
        FINAL = 'final', 'Resultado final'

    MAX_PER_PROJECT = 40

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='photos')
    image = models.OneToOneField(
        'gallery.StoredImage', on_delete=models.CASCADE, related_name='project_photo'
    )
    caption = models.CharField(max_length=200, blank=True)
    stage = models.CharField(max_length=10, choices=Stage.choices, default=Stage.PROGRESS)
    is_cover = models.BooleanField(default=False)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']
        constraints = [
            # Un proyecto tiene como máximo una portada
            models.UniqueConstraint(
                fields=['project'], condition=models.Q(is_cover=True), name='una_portada_por_proyecto',
            ),
        ]

    def __str__(self):
        return f'{self.project.name} · {self.get_stage_display()}'


def pick_cover(photos):
    """Portada de un proyecto: la marcada, si no la primera final, si no la primera."""
    photos = list(photos)
    for p in photos:
        if p.is_cover:
            return p
    for p in photos:
        if p.stage == ProjectPhoto.Stage.FINAL:
            return p
    return photos[0] if photos else None
