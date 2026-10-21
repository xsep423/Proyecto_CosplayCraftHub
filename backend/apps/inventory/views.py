from django.db import transaction
from django.db.models import ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.tenancy import TenantScopedMixin

from .models import Material, StockMovement
from .permissions import MaterialPermission
from .serializers import AdjustSerializer, MaterialSerializer


class MaterialViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    permission_classes = [MaterialPermission]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'No se puede eliminar: el material está asignado a uno o más proyectos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        data = AdjustSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        delta = data.validated_data['delta']

        # Bloquea la fila para que dos ajustes simultáneos no se pisen
        with transaction.atomic():
            # get_queryset() ya está filtrado por taller: un id ajeno da 404
            material = self.get_queryset().select_for_update().filter(pk=pk).first()
            if material is None:
                return Response({'detail': 'Material no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
            new_qty = material.quantity + delta
            if new_qty < 0:
                return Response(
                    {'detail': f'No hay suficiente stock. Existencias actuales: {material.quantity} {material.unit}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            material.quantity = new_qty
            material.save(update_fields=['quantity', 'updated_at'])
            StockMovement.objects.create(
                material=material,
                delta=delta,
                quantity_after=new_qty,
                reason=data.validated_data.get('reason', 'Ajuste'),
                user=request.user,
            )

        return Response(self.get_serializer(material).data)
