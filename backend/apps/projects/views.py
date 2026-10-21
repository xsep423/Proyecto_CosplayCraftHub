from django.db import transaction
from django.db.models import Prefetch
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.inventory.models import Material, StockMovement
from apps.users.tenancy import TenantScopedMixin

from .models import Project, ProjectMaterial, Task
from .permissions import ProjectPermission, ProjectWorkPermission
from .serializers import ProjectMaterialSerializer, ProjectSerializer, TaskSerializer


class ProjectViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Project.objects.select_related('client', 'responsible').prefetch_related(
        'tasks',
        Prefetch('project_materials', queryset=ProjectMaterial.objects.only('quantity', 'unit_cost', 'project_id')),
    )
    serializer_class = ProjectSerializer
    permission_classes = [ProjectPermission]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('client'):
            qs = qs.filter(client_id=params['client'])
        return qs


class TaskViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    # Las tareas no tienen columna workshop: se aíslan a través de su proyecto
    tenant_field = 'project__workshop'
    queryset = Task.objects.select_related('assignee')
    serializer_class = TaskSerializer
    permission_classes = [ProjectWorkPermission]

    def get_queryset(self):
        qs = super().get_queryset()
        project = self.request.query_params.get('project')
        if project:
            qs = qs.filter(project_id=project)
        return qs


class ProjectMaterialViewSet(
    TenantScopedMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Agregar un material a un proyecto descuenta existencias del inventario;
    quitarlo las regresa. Ambos movimientos quedan en el historial de stock.
    """
    tenant_field = 'project__workshop'
    queryset = ProjectMaterial.objects.select_related('material', 'project')
    serializer_class = ProjectMaterialSerializer
    permission_classes = [ProjectWorkPermission]

    def get_queryset(self):
        qs = super().get_queryset()
        project = self.request.query_params.get('project')
        if project:
            qs = qs.filter(project_id=project)
        return qs

    def perform_create(self, serializer):
        project = serializer.validated_data['project']
        qty = serializer.validated_data['quantity']
        with transaction.atomic():
            material = Material.objects.select_for_update().get(
                pk=serializer.validated_data['material'].pk, workshop=self.workshop
            )
            if material.quantity < qty:
                raise ValidationError({
                    'quantity': f'Solo hay {material.quantity} {material.unit} de {material.name}.'
                })
            material.quantity -= qty
            material.save(update_fields=['quantity', 'updated_at'])
            StockMovement.objects.create(
                material=material,
                delta=-qty,
                quantity_after=material.quantity,
                reason=f'Proyecto: {project.name}'[:100],
                user=self.request.user,
            )
            serializer.save(material=material, unit_cost=material.unit_cost)

    def destroy(self, request, *args, **kwargs):
        usage = self.get_object()
        with transaction.atomic():
            material = Material.objects.select_for_update().get(pk=usage.material_id)
            material.quantity += usage.quantity
            material.save(update_fields=['quantity', 'updated_at'])
            StockMovement.objects.create(
                material=material,
                delta=usage.quantity,
                quantity_after=material.quantity,
                reason=f'Devuelto de: {usage.project.name}'[:100],
                user=request.user,
            )
            usage.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
