from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import models
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

    number = models.CharField(max_length=30, unique=True, null=True, blank=True, editable=False)
    client = models.ForeignKey(
        'clientes.Cliente',          # <- AJUSTA si tu modelo se llama distinto
        on_delete=models.PROTECT,
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

    def save(self, *args, **kwargs):
        if not self.valid_until:
            self.valid_until = timezone.localdate() + timedelta(days=30)
        super().save(*args, **kwargs)
        if not self.number:
            self.number = f'CCH-{timezone.localdate().year}-{self.pk:03d}'
            super().save(update_fields=['number'])

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
