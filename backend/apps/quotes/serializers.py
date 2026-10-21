from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.clientes.models import Cliente
from apps.projects.models import Project
from apps.users.tenancy import TenantPrimaryKeyRelatedField
from .models import Quote, QuoteItem


def client_label(client):
    """Nombre legible del cliente, sin depender del nombre exacto del campo."""
    return (
        getattr(client, 'name', None)
        or getattr(client, 'nombre', None)
        or str(client)
    )


class QuoteItemSerializer(serializers.ModelSerializer):
    quantity = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.01'), coerce_to_string=False
    )
    unitPrice = serializers.DecimalField(
        source='unit_price', max_digits=10, decimal_places=2, min_value=0, coerce_to_string=False
    )

    class Meta:
        model = QuoteItem
        fields = ['id', 'description', 'quantity', 'unitPrice', 'type']


class QuoteSerializer(serializers.ModelSerializer):
    # Solo acepta clientes y proyectos del taller del usuario
    clientId = TenantPrimaryKeyRelatedField(source='client', queryset=Cliente.objects.all())
    projectId = TenantPrimaryKeyRelatedField(
        source='project', queryset=Project.objects.all(), required=False, allow_null=True
    )
    clientName = serializers.SerializerMethodField()
    projectName = serializers.CharField(source='project_name', required=False, allow_blank=True)
    discount = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=100, coerce_to_string=False
    )
    tax = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=100, coerce_to_string=False
    )
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    validUntil = serializers.DateField(source='valid_until', read_only=True)
    items = QuoteItemSerializer(many=True)
    subtotal = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = [
            'id', 'number', 'clientId', 'clientName', 'projectId', 'projectName', 'status',
            'items', 'discount', 'tax', 'notes', 'createdAt', 'validUntil',
            'subtotal', 'total',
        ]
        read_only_fields = ['number', 'status']

    def get_clientName(self, obj):
        return client_label(obj.client)

    def get_subtotal(self, obj):
        return float(obj.subtotal)

    def get_total(self, obj):
        return float(obj.total)

    def validate(self, attrs):
        project = attrs.get('project')
        client = attrs.get('client') or getattr(self.instance, 'client', None)
        if project is not None and client is not None and project.client_id != client.id:
            raise serializers.ValidationError({'projectId': 'El proyecto no pertenece a ese cliente.'})
        if project is not None and not attrs.get('project_name'):
            attrs['project_name'] = project.name
        return attrs

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('Agrega al menos una partida.')
        return value

    def create(self, validated_data):
        items = validated_data.pop('items')
        with transaction.atomic():
            quote = Quote.objects.create(created_by=self.context['request'].user, **validated_data)
            QuoteItem.objects.bulk_create([QuoteItem(quote=quote, **i) for i in items])
        return quote

    def update(self, instance, validated_data):
        items = validated_data.pop('items', None)
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if items is not None:
                instance.items.all().delete()
                QuoteItem.objects.bulk_create([QuoteItem(quote=instance, **i) for i in items])
        return instance
