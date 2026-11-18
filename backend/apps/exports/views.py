"""
Exportación de datos del taller a CSV o Excel.

    GET /api/export/<recurso>/<formato>/
        recurso: clientes | inventario | proyectos | cotizaciones
        formato: csv | xlsx

Igual que el resto de la API, todo se filtra por el taller del usuario autenticado.
"""
import csv
import io
from dataclasses import dataclass
from decimal import Decimal

from django.db.models import Count, Prefetch
from django.http import Http404, HttpResponse
from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.clientes.models import Cliente
from apps.inventory.models import Material
from apps.projects.models import Project, ProjectMaterial
from apps.quotes.models import Quote
from apps.users.tenancy import get_workshop

STOCK_LABELS = {'ok': 'Suficiente', 'low': 'Bajo', 'critical': 'Crítico', 'out': 'Agotado'}

# Celdas que Excel interpretaría como fórmula (inyección CSV/DDE)
FORMULA_PREFIXES = ('=', '+', '-', '@', '\t', '\r')


@dataclass
class Column:
    header: str
    width: int = 16
    kind: str = 'text'   # text | money | number | percent | date


def money(value):
    return float(Decimal(value).quantize(Decimal('0.01')))


def full_name(user):
    if user is None:
        return ''
    return f'{user.first_name} {user.last_name}'.strip() or user.username


# ---------- Datos de cada recurso ----------

def clientes_data(workshop):
    columns = [
        Column('Nombre', 28), Column('Correo', 30), Column('Teléfono', 16), Column('Ciudad', 16),
        Column('Estado', 10), Column('Proyectos', 10, 'number'), Column('Total aprobado', 16, 'money'),
        Column('Fecha de registro', 16, 'date'), Column('Notas', 40),
    ]
    qs = (
        Cliente.objects.filter(workshop=workshop)
        .annotate(project_count=Count('projects', distinct=True))
        .prefetch_related(Prefetch(
            'quotes',
            queryset=Quote.objects.filter(status__in=['approved', 'invoiced']).prefetch_related('items'),
            to_attr='won_quotes',
        ))
        .order_by('nombre', 'apellidos')
    )
    rows = [
        [
            str(c), c.correo, c.telefono or '', c.ciudad, c.get_estado_display(), c.project_count,
            money(sum((q.total for q in c.won_quotes), Decimal('0'))),
            timezone.localtime(c.fecha_registro).date(), c.notas or '',
        ]
        for c in qs
    ]
    return columns, rows


def inventario_data(workshop):
    columns = [
        Column('Material', 30), Column('Categoría', 14), Column('Existencias', 12, 'number'),
        Column('Unidad', 12), Column('Costo unitario', 14, 'money'), Column('Valor en inventario', 18, 'money'),
        Column('Stock mínimo', 13, 'number'), Column('Estado de stock', 15), Column('Proveedor', 20),
        Column('Ubicación', 16),
    ]
    qs = Material.objects.filter(workshop=workshop).only(
        'name', 'category', 'quantity', 'unit', 'unit_cost', 'min_stock', 'supplier', 'location'
    ).order_by('category', 'name')
    rows = [
        [
            m.name, m.get_category_display(), float(m.quantity), m.unit, money(m.unit_cost),
            money(m.quantity * m.unit_cost), float(m.min_stock), STOCK_LABELS[m.stock],
            m.supplier, m.location,
        ]
        for m in qs
    ]
    return columns, rows


def proyectos_data(workshop):
    columns = [
        Column('Proyecto', 32), Column('Cliente', 24), Column('Responsable', 20), Column('Estado', 14),
        Column('Prioridad', 11), Column('Inicio', 12, 'date'), Column('Entrega', 12, 'date'),
        Column('Avance', 9, 'percent'), Column('Presupuesto', 14, 'money'), Column('Materiales', 14, 'money'),
        Column('Mano de obra', 14, 'money'), Column('Otros gastos', 14, 'money'), Column('Gasto total', 14, 'money'),
        Column('Presupuesto restante', 20, 'money'), Column('Etiquetas', 24),
    ]
    qs = (
        Project.objects.filter(workshop=workshop)
        .select_related('client', 'responsible')
        .prefetch_related(
            'tasks',
            Prefetch('project_materials', queryset=ProjectMaterial.objects.only('quantity', 'unit_cost', 'project_id')),
        )
        .order_by('due_date', 'id')
    )
    rows = [
        [
            p.name, str(p.client), full_name(p.responsible), p.get_status_display(), p.get_priority_display(),
            p.start_date, p.due_date, p.progress / 100, money(p.budget), money(p.materials_cost),
            money(p.labor_cost), money(p.other_cost), money(p.spent), money(p.budget - p.spent),
            ', '.join(p.tags or []),
        ]
        for p in qs
    ]
    return columns, rows


def cotizaciones_data(workshop):
    columns = [
        Column('Folio', 16), Column('Cliente', 24), Column('Proyecto', 28), Column('Estado', 12),
        Column('Fecha', 12, 'date'), Column('Válida hasta', 13, 'date'), Column('Subtotal', 14, 'money'),
        Column('Descuento', 11, 'percent'), Column('IVA', 9, 'percent'), Column('Total', 14, 'money'),
        Column('Notas', 36),
    ]
    qs = Quote.objects.filter(workshop=workshop).select_related('client').prefetch_related('items')
    rows = [
        [
            q.number, str(q.client), q.project_name, q.get_status_display(),
            timezone.localtime(q.created_at).date(), q.valid_until, money(q.subtotal),
            float(q.discount) / 100, float(q.tax) / 100, money(q.total), q.notes,
        ]
        for q in qs
    ]
    return columns, rows


RESOURCES = {
    'clientes': ('Clientes', clientes_data),
    'inventario': ('Inventario', inventario_data),
    'proyectos': ('Proyectos', proyectos_data),
    'cotizaciones': ('Cotizaciones', cotizaciones_data),
}


# ---------- Formatos de salida ----------

def safe_text(value):
    if isinstance(value, str) and value.startswith(FORMULA_PREFIXES):
        return "'" + value
    return value


def to_csv(columns, rows):
    buffer = io.StringIO()
    # BOM: así Excel abre bien los acentos y la ñ
    buffer.write('﻿')
    writer = csv.writer(buffer)
    writer.writerow([c.header for c in columns])
    for row in rows:
        out = []
        for col, value in zip(columns, row):
            if value is None:
                value = ''
            elif col.kind == 'percent':
                value = f'{round(value * 100, 2):g}%'
            elif col.kind == 'date':
                value = value.isoformat()
            out.append(safe_text(value))
        writer.writerow(out)
    return buffer.getvalue().encode('utf-8')


NUMBER_FORMATS = {
    'money': '#,##0.00',
    'number': '#,##0.##',
    'percent': '0%',
    'date': 'dd/mm/yyyy',
}


def to_xlsx(title, columns, rows, workshop):
    wb = Workbook()
    ws = wb.active
    ws.title = title

    header_font = Font(bold=True, color='FFFFFF')
    header_fill = PatternFill('solid', fgColor='7C3AED')
    ws.append([c.header for c in columns])
    for idx, col in enumerate(columns, start=1):
        cell = ws.cell(row=1, column=idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(vertical='center')
        ws.column_dimensions[get_column_letter(idx)].width = col.width

    for row in rows:
        ws.append([safe_text(v) for v in row])

    for idx, col in enumerate(columns, start=1):
        fmt = NUMBER_FORMATS.get(col.kind)
        if fmt:
            for (cell,) in ws.iter_rows(min_row=2, min_col=idx, max_col=idx):
                cell.number_format = fmt

    ws.freeze_panes = 'A2'
    if rows:
        ws.auto_filter.ref = ws.dimensions

    wb.properties.title = f'{title} · {workshop.name}'
    wb.properties.creator = 'CosplayCraft Hub'

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


CONTENT_TYPES = {
    'csv': 'text/csv; charset=utf-8',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}


class ExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, resource, fmt):
        if resource not in RESOURCES or fmt not in CONTENT_TYPES:
            raise Http404
        workshop = get_workshop(request.user)
        title, build = RESOURCES[resource]
        columns, rows = build(workshop)

        content = to_csv(columns, rows) if fmt == 'csv' else to_xlsx(title, columns, rows, workshop)
        filename = f'{workshop.slug}-{resource}-{timezone.localdate().isoformat()}.{fmt}'
        response = HttpResponse(content, content_type=CONTENT_TYPES[fmt])
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
