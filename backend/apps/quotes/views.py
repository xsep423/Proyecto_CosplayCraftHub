from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clientes.models import Cliente  

from .models import Quote
from .permissions import QuotePermission
from .serializers import QuoteSerializer, client_label


class QuoteViewSet(viewsets.ModelViewSet):
    queryset = Quote.objects.select_related('client').prefetch_related('items')
    serializer_class = QuoteSerializer
    permission_classes = [QuotePermission]

    def update(self, request, *args, **kwargs):
        # Solo se editan borradores; el resto cambia de estado con /status/
        if self.get_object().status != Quote.Status.DRAFT:
            return Response(
                {'detail': 'Solo se pueden editar cotizaciones en borrador.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='status')
    def set_status(self, request, pk=None):
        quote = self.get_object()
        new_status = request.data.get('status')

        if new_status not in Quote.Status.values:
            return Response({'detail': 'Estado inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_status not in Quote.TRANSITIONS[quote.status]:
            return Response(
                {'detail': f'No se puede pasar de "{quote.get_status_display()}" a "{Quote.Status(new_status).label}".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        quote.status = new_status
        quote.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(quote).data)


class ClientOptionsView(APIView):
    """Lista mínima de clientes (id y nombre) para el selector de cotizaciones."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response([{'id': c.id, 'name': client_label(c)} for c in Cliente.objects.all()])
