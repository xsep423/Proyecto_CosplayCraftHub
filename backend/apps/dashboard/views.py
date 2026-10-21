from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clientes.models import Cliente
from apps.inventory.models import Material
from apps.projects.models import Project
from apps.projects.serializers import ProjectSerializer
from apps.quotes.models import Quote
from apps.users.tenancy import get_workshop

ACTIVE_STATUSES = ('in_progress', 'review')
OPEN_STATUSES = ('planning', 'in_progress', 'review', 'on_hold')
STALE_QUOTE_DAYS = 7


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
            .prefetch_related('tasks', 'project_materials')
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

        # ---- Alertas ----
        alerts = []
        severity = {'out': 0, 'critical': 1, 'low': 2}
        for m in sorted(stock_alerts, key=lambda m: severity[m.stock]):
            label = {'out': 'sin existencias', 'critical': 'stock crítico', 'low': 'stock bajo'}[m.stock]
            detail = '' if m.stock == 'out' else f' ({m.quantity.normalize():f} {m.unit})'
            alerts.append({
                'type': 'danger' if m.stock in ('out', 'critical') else 'warning',
                'kind': 'stock',
                'text': f'{m.name}: {label}{detail}',
                'link': '/inventory',
            })
        for p in sorted(open_projects, key=lambda p: p.due_date):
            days = (p.due_date - today).days
            if days < 0:
                alerts.append({
                    'type': 'danger', 'kind': 'project',
                    'text': f'{p.name}: entrega vencida hace {-days} día{"s" if -days != 1 else ""}',
                    'link': f'/projects/{p.id}',
                })
            elif days <= 7:
                alerts.append({
                    'type': 'warning', 'kind': 'project',
                    'text': f'{p.name}: entrega en {days} día{"s" if days != 1 else ""}',
                    'link': f'/projects/{p.id}',
                })
        for q in sent_quotes:
            age = (today - timezone.localtime(q.updated_at).date()).days
            if age >= STALE_QUOTE_DAYS:
                alerts.append({
                    'type': 'info', 'kind': 'quote',
                    'text': f'Cotización {q.number} enviada hace {age} días, sin respuesta',
                    'link': '/quotes',
                })

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
