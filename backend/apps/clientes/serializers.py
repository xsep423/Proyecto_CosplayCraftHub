from decimal import Decimal, InvalidOperation

from django.utils import timezone
from rest_framework import serializers

from .models import MEDIDAS_KEYS, Cliente


class ClienteSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    name = serializers.CharField(source='nombre', max_length=150)
    email = serializers.EmailField(source='correo')
    phone = serializers.CharField(source='telefono', max_length=30, required=False, allow_blank=True)
    city = serializers.CharField(source='ciudad', max_length=100, required=False, allow_blank=True)
    status = serializers.ChoiceField(source='estado', choices=Cliente.Estado.choices, required=False)
    notes = serializers.CharField(source='notas', required=False, allow_blank=True)
    projects = serializers.SerializerMethodField()
    totalSpent = serializers.SerializerMethodField()
    joinedAt = serializers.DateTimeField(source='fecha_registro', read_only=True, format='%Y-%m-%d')
    measurements = serializers.JSONField(source='medidas', required=False)
    measurementNotes = serializers.CharField(source='medidas_notas', required=False, allow_blank=True)
    measurementsUpdatedAt = serializers.DateTimeField(source='medidas_actualizadas', read_only=True)

    class Meta:
        model = Cliente
        fields = [
            'id', 'name', 'email', 'phone', 'city', 'status',
            'notes', 'projects', 'totalSpent', 'joinedAt',
            'measurements', 'measurementNotes', 'measurementsUpdatedAt',
        ]

    def validate_email(self, value):
        # Único por taller, no global
        qs = Cliente.objects.filter(workshop=self.context['workshop'], correo__iexact=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe un cliente con ese correo.')
        return value

    def validate_measurements(self, value):
        """Solo medidas conocidas, en cm, entre 1 y 300. Vacío o null borra la medida."""
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError('Las medidas deben ser un objeto {medida: valor}.')
        unknown = sorted(set(value) - set(MEDIDAS_KEYS))
        if unknown:
            raise serializers.ValidationError(f'Medidas no reconocidas: {", ".join(unknown)}.')
        clean = {}
        for key in MEDIDAS_KEYS:
            raw = value.get(key)
            if raw in (None, ''):
                continue
            try:
                number = Decimal(str(raw))
            except (InvalidOperation, ValueError):
                raise serializers.ValidationError({key: 'Debe ser un número.'})
            if not number.is_finite() or number <= 0 or number > 300:
                raise serializers.ValidationError({key: 'Debe estar entre 1 y 300.'})
            clean[key] = float(round(number, 1))
        return clean

    def _touch_measurements(self, instance, validated_data):
        changed = (
            ('medidas' in validated_data and validated_data['medidas'] != (instance.medidas if instance else {}))
            or ('medidas_notas' in validated_data
                and validated_data['medidas_notas'] != (instance.medidas_notas if instance else ''))
        )
        if changed:
            validated_data['medidas_actualizadas'] = timezone.now()

    def get_projects(self, obj):
        # La vista lo anota; al crear o editar un cliente se cuenta aparte
        count = getattr(obj, 'project_count', None)
        return obj.projects.count() if count is None else count

    def get_totalSpent(self, obj):
        # Lo que el cliente ha aprobado o pagado en cotizaciones
        quotes = getattr(obj, 'won_quotes', None)
        if quotes is None:
            quotes = obj.quotes.filter(status__in=['approved', 'invoiced']).prefetch_related('items')
        return float(sum((q.total for q in quotes), 0))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['name'] = f'{instance.nombre} {instance.apellidos}'.strip()
        data['phone'] = data['phone'] or ''
        data['notes'] = data['notes'] or ''
        return data

    def create(self, validated_data):
        validated_data['apellidos'] = ''
        self._touch_measurements(None, validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'nombre' in validated_data:
            validated_data['apellidos'] = ''
        self._touch_measurements(instance, validated_data)
        return super().update(instance, validated_data)