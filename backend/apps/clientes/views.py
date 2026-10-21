from rest_framework import viewsets

from apps.users.tenancy import TenantScopedMixin

from .models import Cliente
from .permissions import ClientePermission
from .serializers import ClienteSerializer


class ClienteViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by('-fecha_registro')
    serializer_class = ClienteSerializer
    permission_classes = [ClientePermission]
