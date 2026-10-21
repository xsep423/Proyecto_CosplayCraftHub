from decimal import Decimal

from django.conf import settings
from django.db import models


class Material(models.Model):
    class Category(models.TextChoices):
        ESTRUCTURA = 'Estructura', 'Estructura'
        TELA = 'Tela', 'Tela'
        PINTURA = 'Pintura', 'Pintura'
        ELECTRONICA = 'Electrónica', 'Electrónica'
        COSTURA = 'Costura', 'Costura'
        ADHESIVOS = 'Adhesivos', 'Adhesivos'
        ACCESORIOS = 'Accesorios', 'Accesorios'

    workshop = models.ForeignKey(
        'users.Workshop', on_delete=models.CASCADE, related_name='materials'
    )
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=30, choices=Category.choices)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit = models.CharField(max_length=30)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    supplier = models.CharField(max_length=150, blank=True)
    location = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def stock(self):
        """Misma regla que computeStock en el frontend."""
        if self.quantity == 0:
            return 'out'
        if self.quantity < self.min_stock * Decimal('0.5'):
            return 'critical'
        if self.quantity < self.min_stock:
            return 'low'
        return 'ok'

    def __str__(self):
        return self.name


class StockMovement(models.Model):
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='movements')
    delta = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_after = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=100, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.material.name}: {self.delta:+}'
