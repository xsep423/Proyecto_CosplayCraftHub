from rest_framework import serializers

from .models import Material, StockMovement


class MaterialSerializer(serializers.ModelSerializer):
    # El frontend usa camelCase y espera números, no strings
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, coerce_to_string=False)
    unitCost = serializers.DecimalField(
        source='unit_cost', max_digits=10, decimal_places=2, min_value=0, coerce_to_string=False
    )
    minStock = serializers.DecimalField(
        source='min_stock', max_digits=10, decimal_places=2, min_value=0, coerce_to_string=False
    )
    stock = serializers.CharField(read_only=True)

    class Meta:
        model = Material
        fields = [
            'id', 'name', 'category', 'quantity', 'unit',
            'unitCost', 'minStock', 'supplier', 'location', 'stock',
        ]

    def create(self, validated_data):
        material = super().create(validated_data)
        if material.quantity:
            StockMovement.objects.create(
                material=material,
                delta=material.quantity,
                quantity_after=material.quantity,
                reason='Existencia inicial',
                user=self.context['request'].user,
            )
        return material

    def update(self, instance, validated_data):
        old_qty = instance.quantity
        material = super().update(instance, validated_data)
        if material.quantity != old_qty:
            StockMovement.objects.create(
                material=material,
                delta=material.quantity - old_qty,
                quantity_after=material.quantity,
                reason='Edición manual',
                user=self.context['request'].user,
            )
        return material


class AdjustSerializer(serializers.Serializer):
    delta = serializers.DecimalField(max_digits=10, decimal_places=2)
    reason = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_delta(self, value):
        if value == 0:
            raise serializers.ValidationError('El ajuste no puede ser cero.')
        return value
