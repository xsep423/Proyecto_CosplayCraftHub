from django.db.models import Count, Prefetch
from rest_framework import viewsets

from apps.quotes.models import Quote

from apps.users.tenancy import TenantScopedMixin

from .models import Cliente
from .permissions import ClientePermission
from .serializers import ClienteSerializer


class ClienteViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    # Conteo de proyectos y cotizaciones ganadas en pocas consultas (no 2 por cliente)
    queryset = (
        Cliente.objects.all()
        .annotate(project_count=Count('projects', distinct=True))
        .prefetch_related(Prefetch(
            'quotes',
            queryset=Quote.objects.filter(status__in=['approved', 'invoiced']).prefetch_related('items'),
            to_attr='won_quotes',
        ))
        .order_by('-fecha_registro')
    )
    serializer_class = ClienteSerializer
    permission_classes = [ClientePermission]
