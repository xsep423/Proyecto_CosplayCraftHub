"""
Alertas del taller: stock bajo, entregas próximas o vencidas y cotizaciones sin
respuesta. Las usan el dashboard y la campana de notificaciones.

Cada alerta lleva un `id` estable (por ejemplo "stock-12-low") para que el
frontend recuerde cuáles ya se leyeron. Si la situación cambia (el stock pasa
de bajo a agotado) el id cambia y la alerta vuelve a aparecer como nueva.
"""
from django.utils import timezone

from apps.inventory.models import Material
from apps.projects.models import Project
from apps.quotes.models import Quote

OPEN_STATUSES = ('planning', 'in_progress', 'review', 'on_hold')
STALE_QUOTE_DAYS = 7
DUE_SOON_DAYS = 7

STOCK_SEVERITY = {'out': 0, 'critical': 1, 'low': 2}
STOCK_LABEL = {'out': 'sin existencias', 'critical': 'stock crítico', 'low': 'stock bajo'}


def plural(n, word):
    return f'{n} {word}{"s" if n != 1 else ""}'


def build_alerts(projects, materials, quotes, today=None):
    """Recibe listas ya filtradas por taller y devuelve las alertas ordenadas por grupo."""
    today = today or timezone.localdate()
    alerts = []

    low_stock = [m for m in materials if m.stock != 'ok']
    for m in sorted(low_stock, key=lambda m: STOCK_SEVERITY[m.stock]):
        detail = '' if m.stock == 'out' else f' ({m.quantity.normalize():f} {m.unit})'
        alerts.append({
            'id': f'stock-{m.pk}-{m.stock}',
            'type': 'danger' if m.stock in ('out', 'critical') else 'warning',
            'kind': 'stock',
            'text': f'{m.name}: {STOCK_LABEL[m.stock]}{detail}',
            'link': '/inventory',
        })

    open_projects = [p for p in projects if p.status in OPEN_STATUSES]
    for p in sorted(open_projects, key=lambda p: p.due_date):
        days = (p.due_date - today).days
        if days < 0:
            alerts.append({
                'id': f'project-{p.pk}-overdue',
                'type': 'danger', 'kind': 'project',
                'text': f'{p.name}: entrega vencida hace {plural(-days, "día")}',
                'link': f'/projects/{p.pk}',
            })
        elif days <= DUE_SOON_DAYS:
            alerts.append({
                'id': f'project-{p.pk}-soon-{p.due_date.isoformat()}',
                'type': 'warning', 'kind': 'project',
                'text': f'{p.name}: entrega hoy' if days == 0 else f'{p.name}: entrega en {plural(days, "día")}',
                'link': f'/projects/{p.pk}',
            })

    for q in quotes:
        if q.status != Quote.Status.SENT:
            continue
        age = (today - timezone.localtime(q.updated_at).date()).days
        if age >= STALE_QUOTE_DAYS:
            alerts.append({
                'id': f'quote-{q.pk}-stale',
                'type': 'info', 'kind': 'quote',
                'text': f'Cotización {q.number} enviada hace {age} días, sin respuesta',
                'link': '/quotes',
            })

    return alerts


def workshop_alerts(workshop, today=None):
    """Consulta solo lo necesario para calcular las alertas de un taller."""
    projects = Project.objects.filter(workshop=workshop, status__in=OPEN_STATUSES).only(
        'id', 'name', 'status', 'due_date'
    )
    materials = Material.objects.filter(workshop=workshop).only(
        'id', 'name', 'quantity', 'min_stock', 'unit'
    )
    quotes = Quote.objects.filter(workshop=workshop, status=Quote.Status.SENT).only(
        'id', 'number', 'status', 'updated_at'
    )
    return build_alerts(list(projects), list(materials), list(quotes), today)
