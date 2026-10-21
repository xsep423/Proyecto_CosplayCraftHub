from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone


class Quote(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Borrador'
        SENT = 'sent', 'Enviada'
        APPROVED = 'approved', 'Aprobada'
        REJECTED = 'rejected', 'Rechazada'
        INVOICED = 'invoiced', 'Facturada'

    # Estados a los que se puede pasar desde cada uno
    TRANSITIONS = {
        'draft': ['sent'],
        'sent': ['approved', 'rejected', 'draft'],
        'approved': ['invoiced'],
        'rejected': ['draft'],
        'invoiced': [],
    }

    workshop = models.ForeignKey(
        'users.Workshop', on_delete=models.CASCADE, related_name='quotes'
    )
    # Consecutivo por taller: cada taller empieza su folio en 1
    seq = models.PositiveIntegerField(null=True, blank=True, editable=False)
    number = models.CharField(max_length=30, null=True, blank=True, editable=False)
    client = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.PROTECT,
        related_name='quotes',
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quotes',
    )
    project_name = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=5, decimal_places=2, default=16)
    notes = models.TextField(blank=True)
    valid_until = models.DateField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['workshop', 'number'], name='quote_folio_unico_por_taller'),
        ]

    def save(self, *args, **kwargs):
        if not self.valid_until:
            self.valid_until = timezone.localdate() + timedelta(days=30)
        if not self.number:
            with transaction.atomic():
                # Bloquea el taller para que dos cotizaciones simultáneas no tomen el mismo folio
                workshop = type(self.workshop).objects.select_for_update().get(pk=self.workshop_id)
                last = Quote.objects.filter(workshop=workshop).aggregate(m=models.Max('seq'))['m'] or 0
                self.seq = last + 1
                self.number = f'{workshop.quote_prefix}-{timezone.localdate().year}-{self.seq:03d}'
                super().save(*args, **kwargs)
            return
        super().save(*args, **kwargs)

    @property
    def subtotal(self):
        return sum((i.quantity * i.unit_price for i in self.items.all()), Decimal('0'))

    @property
    def total(self):
        t = self.subtotal * (1 - self.discount / Decimal('100')) * (1 + self.tax / Decimal('100'))
        return t.quantize(Decimal('0.01'))

    def __str__(self):
        return self.number or f'Cotización {self.pk}'


class QuoteItem(models.Model):
    class ItemType(models.TextChoices):
        MATERIAL = 'material', 'Material'
        LABOR = 'labor', 'Mano de obra'

    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=10, choices=ItemType.choices, default=ItemType.MATERIAL)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.description
