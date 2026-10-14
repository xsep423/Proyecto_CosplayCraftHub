from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    name = serializers.CharField(source='nombre', max_length=150)
    email = serializers.EmailField(
        source='correo',
        validators=[
            UniqueValidator(
                queryset=Cliente.objects.all(),
                message='Ya existe un cliente con ese correo.',
            )
        ],
    )
    phone = serializers.CharField(source='telefono', max_length=30, required=False, allow_blank=True)
    city = serializers.CharField(source='ciudad', max_length=100, required=False, allow_blank=True)
    status = serializers.ChoiceField(source='estado', choices=Cliente.Estado.choices, required=False)
    notes = serializers.CharField(source='notas', required=False, allow_blank=True)
    projects = serializers.SerializerMethodField()
    totalSpent = serializers.SerializerMethodField()
    joinedAt = serializers.DateTimeField(source='fecha_registro', read_only=True, format='%Y-%m-%d')

    class Meta:
        model = Cliente
        fields = [
            'id', 'name', 'email', 'phone', 'city', 'status',
            'notes', 'projects', 'totalSpent', 'joinedAt',
        ]

    # Todavía no hay módulo de proyectos en el backend
    def get_projects(self, obj):
        return 0

    def get_totalSpent(self, obj):
        return 0

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['name'] = f'{instance.nombre} {instance.apellidos}'.strip()
        data['phone'] = data['phone'] or ''
        data['notes'] = data['notes'] or ''
        return data

    def create(self, validated_data):
        validated_data['apellidos'] = ''
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'nombre' in validated_data:
            validated_data['apellidos'] = ''
        return super().update(instance, validated_data)