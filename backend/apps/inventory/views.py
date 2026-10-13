from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Material, StockMovement
from .permissions import MaterialPermission
from .serializers import AdjustSerializer, MaterialSerializer


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    permission_classes = [MaterialPermission]

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        data = AdjustSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        delta = data.validated_data['delta']

        # Bloquea la fila para que dos ajustes simultáneos no se pisen
        with transaction.atomic():
            material = Material.objects.select_for_update().get(pk=pk)
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

        return Response(MaterialSerializer(material, context={'request': request}).data)
