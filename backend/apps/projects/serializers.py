from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import serializers

from apps.clientes.models import Cliente
from apps.inventory.models import Material
from apps.users.tenancy import TenantPrimaryKeyRelatedField

from .models import Project, ProjectMaterial, Task


def user_label(user):
    if user is None:
        return ''
    return f'{user.first_name} {user.last_name}'.strip() or user.username


def money(value):
    return float(Decimal(value).quantize(Decimal('0.01')))


class ProjectSerializer(serializers.ModelSerializer):
    # Solo acepta clientes y usuarios del taller del usuario autenticado
    clientId = TenantPrimaryKeyRelatedField(source='client', queryset=Cliente.objects.all())
    clientName = serializers.SerializerMethodField()
    responsibleId = TenantPrimaryKeyRelatedField(
        source='responsible',
        queryset=User.objects.filter(is_active=True),
        tenant_field='profile__workshop',
        required=False,
        allow_null=True,
    )
    responsible = serializers.SerializerMethodField()
    startDate = serializers.DateField(source='start_date')
    dueDate = serializers.DateField(source='due_date')
    budget = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, coerce_to_string=False)
    laborCost = serializers.DecimalField(
        source='labor_cost', max_digits=10, decimal_places=2, min_value=0,
        coerce_to_string=False, required=False,
    )
    otherCost = serializers.DecimalField(
        source='other_cost', max_digits=10, decimal_places=2, min_value=0,
        coerce_to_string=False, required=False,
    )
    tags = serializers.ListField(child=serializers.CharField(max_length=40), required=False)
    progress = serializers.IntegerField(read_only=True)
    materialsCost = serializers.SerializerMethodField()
    spent = serializers.SerializerMethodField()
    taskCount = serializers.SerializerMethodField()
    doneTasks = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'clientId', 'clientName', 'description',
            'responsibleId', 'responsible', 'status', 'priority',
            'startDate', 'dueDate', 'progress', 'budget', 'laborCost', 'otherCost',
            'materialsCost', 'spent', 'tags', 'taskCount', 'doneTasks', 'createdAt',
        ]

    def get_clientName(self, obj):
        return str(obj.client)

    def get_responsible(self, obj):
        return user_label(obj.responsible)

    def get_materialsCost(self, obj):
        return money(obj.materials_cost)

    def get_spent(self, obj):
        return money(obj.spent)

    def get_taskCount(self, obj):
        return len(obj.tasks.all())

    def get_doneTasks(self, obj):
        return sum(1 for t in obj.tasks.all() if t.status == Task.Status.DONE)

    def validate_tags(self, value):
        # Sin vacíos ni repetidos, conservando el orden
        clean = []
        for tag in value:
            tag = tag.strip()
            if tag and tag not in clean:
                clean.append(tag)
        return clean

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        due = attrs.get('due_date', getattr(self.instance, 'due_date', None))
        if start and due and due < start:
            raise serializers.ValidationError({'dueDate': 'La entrega no puede ser antes del inicio.'})
        return attrs


class TaskSerializer(serializers.ModelSerializer):
    projectId = TenantPrimaryKeyRelatedField(source='project', queryset=Project.objects.all())
    assigneeId = TenantPrimaryKeyRelatedField(
        source='assignee',
        queryset=User.objects.filter(is_active=True),
        tenant_field='profile__workshop',
        required=False,
        allow_null=True,
    )
    assignee = serializers.SerializerMethodField()
    dueDate = serializers.DateField(source='due_date', required=False, allow_null=True)

    class Meta:
        model = Task
        fields = [
            'id', 'projectId', 'title', 'description', 'status',
            'priority', 'assigneeId', 'assignee', 'dueDate',
        ]

    def get_assignee(self, obj):
        return user_label(obj.assignee)

    def validate_projectId(self, value):
        # Una tarea no se puede mover a otro proyecto
        if self.instance is not None and value.pk != self.instance.project_id:
            raise serializers.ValidationError('No se puede cambiar el proyecto de una tarea.')
        return value


class ProjectMaterialSerializer(serializers.ModelSerializer):
    projectId = TenantPrimaryKeyRelatedField(source='project', queryset=Project.objects.all())
    materialId = TenantPrimaryKeyRelatedField(source='material', queryset=Material.objects.all())
    materialName = serializers.CharField(source='material.name', read_only=True)
    category = serializers.CharField(source='material.category', read_only=True)
    unit = serializers.CharField(source='material.unit', read_only=True)
    quantity = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.01'), coerce_to_string=False
    )
    unitCost = serializers.DecimalField(
        source='unit_cost', max_digits=10, decimal_places=2, read_only=True, coerce_to_string=False
    )
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMaterial
        fields = [
            'id', 'projectId', 'materialId', 'materialName', 'category',
            'unit', 'quantity', 'unitCost', 'subtotal',
        ]

    def get_subtotal(self, obj):
        return money(obj.subtotal)
