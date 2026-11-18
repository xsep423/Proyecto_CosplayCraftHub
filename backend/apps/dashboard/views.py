from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clientes.models import Cliente
from apps.inventory.models import Material
from apps.projects.models import Project
from apps.projects.serializers import ProjectSerializer, photos_prefetch
from apps.quotes.models import Quote
from apps.users.tenancy import get_workshop

from .alerts import OPEN_STATUSES, build_alerts, workshop_alerts

ACTIVE_STATUSES = ('in_progress', 'review')


def money(value):
    return float(Decimal(value).quantize(Decimal('0.01')))


class DashboardSummaryView(APIView):
    """Resumen del taller del usuario. Todo se filtra por su workshop."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        workshop = get_workshop(request.user)
        today = timezone.localdate()
        month_start = today.replace(day=1)

        projects = list(
            Project.objects.filter(workshop=workshop)
            .select_related('client', 'responsible')
            .prefetch_related('tasks', 'project_materials', photos_prefetch())
        )
        clients = Cliente.objects.filter(workshop=workshop)
        materials = list(Material.objects.filter(workshop=workshop))
        quotes = list(
            Quote.objects.filter(workshop=workshop).select_related('client').prefetch_related('items')
        )

        open_projects = [p for p in projects if p.status in OPEN_STATUSES]
        active_projects = [p for p in projects if p.status in ACTIVE_STATUSES]
        stock_alerts = [m for m in materials if m.stock != 'ok']
        pending_quotes = [q for q in quotes if q.status in ('draft', 'sent')]
        sent_quotes = [q for q in quotes if q.status == 'sent']
        won_quotes = [q for q in quotes if q.status in ('approved', 'invoiced')]

        ctx = {'request': request, 'workshop': workshop}
        upcoming = sorted(open_projects, key=lambda p: p.due_date)[:5]
        in_progress = [p for p in projects if p.status == 'in_progress'][:4]

        alerts = build_alerts(projects, materials, quotes, today)

        status_counts = {s: 0 for s, _ in Project.Status.choices}
        for p in projects:
            status_counts[p.status] += 1

        return Response({
            'workshop': {'id': workshop.id, 'name': workshop.name, 'currency': workshop.currency},
            'stats': {
                'activeProjects': len(active_projects),
                'newProjectsThisMonth': sum(1 for p in projects if p.created_at.date() >= month_start),
                'activeClients': clients.filter(estado='active').count(),
                'newClientsThisMonth': clients.filter(fecha_registro__date__gte=month_start).count(),
                'stockAlerts': len(stock_alerts),
                'criticalStock': sum(1 for m in stock_alerts if m.stock in ('critical', 'out')),
                'pendingQuotes': len(pending_quotes),
                'sentQuotesTotal': money(sum((q.total for q in sent_quotes), Decimal('0'))),
                'wonQuotesTotal': money(sum((q.total for q in won_quotes), Decimal('0'))),
            },
            'projectsByStatus': status_counts,
            'upcoming': ProjectSerializer(upcoming, many=True, context=ctx).data,
            'inProgress': ProjectSerializer(in_progress, many=True, context=ctx).data,
            'alerts': alerts[:8],
        })


class NotificationsView(APIView):
    """Todas las alertas vigentes del taller, para la campana de notificaciones."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(workshop_alerts(get_workshop(request.user)))
