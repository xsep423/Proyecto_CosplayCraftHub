"""
Pruebas de exportación a CSV y Excel.

    python manage.py test apps.exports
"""
import csv
import io
from decimal import Decimal

from openpyxl import load_workbook

from apps.quotes.models import Quote, QuoteItem
from apps.users.testutils import TenantAPITestCase, make_client, make_material, make_project


def read_csv(response):
    text = response.content.decode('utf-8')
    assert text.startswith('﻿')
    return list(csv.reader(io.StringIO(text.lstrip('﻿'))))


class ExportTests(TenantAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.cliente = make_client(cls.workshop, name='Ñoño Pérez', email='nono@correo.com', ciudad='León')
        make_client(cls.other, name='Cliente Ajeno', email='ajeno@correo.com')
        cls.material = make_material(cls.workshop, name='EVA Foam', quantity=3, unit_cost=120, min_stock=5)
        cls.project = make_project(cls.workshop, cls.cliente, name='Armadura', tags=['WoW', 'LED'])
        quote = Quote.objects.create(workshop=cls.workshop, client=cls.cliente, tax=Decimal('16'))
        QuoteItem.objects.create(quote=quote, description='Casco', quantity=1, unit_price=Decimal('1000'))

    def test_clientes_csv(self):
        self.as_user(self.viewer)
        res = self.client.get('/api/export/clientes/csv/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/csv', res['Content-Type'])
        self.assertIn('attachment; filename="taller-uno-clientes-', res['Content-Disposition'])
        rows = read_csv(res)
        self.assertEqual(rows[0][:2], ['Nombre', 'Correo'])
        self.assertEqual([r[0] for r in rows[1:]], ['Ñoño Pérez'])  # sin datos del otro taller

    def test_inventario_xlsx(self):
        self.as_user(self.viewer)
        res = self.client.get('/api/export/inventario/xlsx/')
        self.assertEqual(res.status_code, 200)
        ws = load_workbook(io.BytesIO(res.content)).active
        header = [c.value for c in ws[1]]
        row = dict(zip(header, [c.value for c in ws[2]]))
        self.assertEqual(row['Material'], 'EVA Foam')
        self.assertEqual(row['Existencias'], 3)
        self.assertEqual(row['Valor en inventario'], 360)
        self.assertEqual(row['Estado de stock'], 'Bajo')
        self.assertEqual(ws.max_row, 2)

    def test_proyectos_y_cotizaciones(self):
        self.as_user(self.admin)
        rows = read_csv(self.client.get('/api/export/proyectos/csv/'))
        project = dict(zip(rows[0], rows[1]))
        self.assertEqual(project['Proyecto'], 'Armadura')
        self.assertEqual(project['Etiquetas'], 'WoW, LED')
        self.assertEqual(project['Avance'], '0%')

        ws = load_workbook(io.BytesIO(self.client.get('/api/export/cotizaciones/xlsx/').content)).active
        quote = dict(zip([c.value for c in ws[1]], [c.value for c in ws[2]]))
        self.assertEqual(quote['Total'], 1160)
        self.assertEqual(quote['Estado'], 'Borrador')

    def test_evita_formulas_en_celdas(self):
        make_client(self.workshop, name='=HYPERLINK("http://malo")', email='malo@correo.com')
        self.as_user(self.admin)
        names = [r[0] for r in read_csv(self.client.get('/api/export/clientes/csv/'))[1:]]
        self.assertIn('\'=HYPERLINK("http://malo")', names)

        ws = load_workbook(io.BytesIO(self.client.get('/api/export/clientes/xlsx/').content)).active
        self.assertTrue(all(not str(c.value).startswith('=') for c in ws['A']))

    def test_recurso_o_formato_desconocido(self):
        self.as_user(self.admin)
        self.assertEqual(self.client.get('/api/export/usuarios/csv/').status_code, 404)
        self.assertEqual(self.client.get('/api/export/clientes/pdf/').status_code, 404)

    def test_requiere_sesion(self):
        self.assertEqual(self.client.get('/api/export/clientes/csv/').status_code, 401)

    def test_taller_vacio_exporta_solo_encabezados(self):
        self.as_user(self.other_admin)
        rows = read_csv(self.client.get('/api/export/proyectos/csv/'))
        self.assertEqual(len(rows), 1)
        ws = load_workbook(io.BytesIO(self.client.get('/api/export/proyectos/xlsx/').content)).active
        self.assertEqual(ws.max_row, 1)
