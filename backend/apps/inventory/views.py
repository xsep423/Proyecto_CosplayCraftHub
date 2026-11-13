from django.db import transaction
from django.db.models import ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.gallery.models import StoredImage
from apps.gallery.storage import save_upload
from apps.users.tenancy import TenantScopedMixin

from .models import Material, StockMovement
from .permissions import MaterialPermission
from .serializers import AdjustSerializer, MaterialSerializer


class MaterialViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Material.objects.select_related('image').defer(
        *[f'image__{f}' for f in StoredImage.HEAVY_FIELDS]
    )
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
            material = self.get_queryset().select_for_update(of=('self',)).filter(pk=pk).first()
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

    @action(detail=True, methods=['post', 'delete'], url_path='image', parser_classes=[MultiPartParser])
    def image(self, request, pk=None):
        """POST (multipart, campo 'file') reemplaza la foto del material; DELETE la quita."""
        material = self.get_object()
        old = material.image
        if request.method == 'POST':
            material.image = save_upload(self.workshop, request.FILES.get('file'), folder='materiales')
        else:
            material.image = None
        material.save(update_fields=['image', 'updated_at'])
        if old is not None:
            old.delete()
        return Response(self.get_serializer(material).data)
