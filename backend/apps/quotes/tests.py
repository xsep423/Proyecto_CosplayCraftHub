"""
Pruebas de cotizaciones: totales, folios y flujo de estados.

    python manage.py test apps.quotes
"""
from decimal import Decimal

from apps.quotes.models import Quote, QuoteItem
from apps.users.testutils import TenantAPITestCase, make_client, make_project

URL = '/api/quotes/'


class QuoteTotalsTests(TenantAPITestCase):
    def test_total_con_descuento_e_iva(self):
        quote = Quote.objects.create(
            workshop=self.workshop, client=make_client(self.workshop),
            discount=Decimal('10'), tax=Decimal('16'),
        )
        QuoteItem.objects.create(quote=quote, description='Casco', quantity=2, unit_price=Decimal('500'))
        QuoteItem.objects.create(quote=quote, description='Pintura', quantity=Decimal('1.5'), unit_price=Decimal('200'))
        self.assertEqual(quote.subtotal, Decimal('1300'))
        # 1300 * 0.90 * 1.16
        self.assertEqual(quote.total, Decimal('1357.20'))

    def test_folio_consecutivo_por_taller(self):
        self.workshop.quote_prefix = 'UNO'
        self.workshop.save()
        a = Quote.objects.create(workshop=self.workshop, client=make_client(self.workshop))
        b = Quote.objects.create(workshop=self.workshop, client=a.client)
        c = Quote.objects.create(workshop=self.other, client=make_client(self.other, email='x@correo.com'))
        self.assertEqual((a.seq, b.seq, c.seq), (1, 2, 1))
        self.assertTrue(a.number.startswith('UNO-') and a.number.endswith('-001'))
        self.assertTrue(b.number.endswith('-002'))
        self.assertIsNotNone(a.valid_until)


class QuoteApiTests(TenantAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.cliente = make_client(cls.workshop)
        cls.otro_cliente = make_client(cls.workshop, name='Otro', email='otro@correo.com')

    def payload(self, **extra):
        data = {
            'clientId': self.cliente.pk, 'discount': 0, 'tax': 16, 'notes': '',
            'items': [
                {'description': 'Mano de obra', 'quantity': 10, 'unitPrice': 250, 'type': 'labor'},
                {'description': 'EVA foam', 'quantity': 3, 'unitPrice': 120, 'type': 'material'},
            ],
        }
        data.update(extra)
        return data

    def create(self, **extra):
        res = self.client.post(URL, self.payload(**extra), format='json')
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def test_crear_cotizacion(self):
        self.as_user(self.maker)
        data = self.create()
        self.assertEqual(data['status'], 'draft')
        self.assertEqual(data['subtotal'], 2860.0)
        self.assertEqual(data['total'], 3317.6)
        self.assertEqual(len(data['items']), 2)

    def test_requiere_partidas(self):
        self.as_user(self.maker)
        res = self.client.post(URL, self.payload(items=[]), format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('items', res.data)

    def test_proyecto_debe_ser_del_mismo_cliente(self):
        project = make_project(self.workshop, self.otro_cliente)
        self.as_user(self.maker)
        res = self.client.post(URL, self.payload(projectId=project.pk), format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('projectId', res.data)

    def test_toma_el_nombre_del_proyecto(self):
        project = make_project(self.workshop, self.cliente, name='Espada Frostmourne')
        self.as_user(self.maker)
        self.assertEqual(self.create(projectId=project.pk)['projectName'], 'Espada Frostmourne')

    def test_flujo_de_estados(self):
        self.as_user(self.maker)
        quote_id = self.create()['id']
        status_url = f'{URL}{quote_id}/status/'

        # Borrador -> aprobada no está permitido
        self.assertEqual(self.client.post(status_url, {'status': 'approved'}, format='json').status_code, 400)
        for step in ['sent', 'approved', 'invoiced']:
            res = self.client.post(status_url, {'status': step}, format='json')
            self.assertEqual(res.status_code, 200, (step, res.data))
            self.assertEqual(res.data['status'], step)
        # Facturada es final
        self.assertEqual(self.client.post(status_url, {'status': 'draft'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(status_url, {'status': 'inventado'}, format='json').status_code, 400)

    def test_solo_se_editan_borradores(self):
        self.as_user(self.maker)
        quote_id = self.create()['id']
        res = self.client.put(f'{URL}{quote_id}/', self.payload(notes='Cambio'), format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.client.post(f'{URL}{quote_id}/status/', {'status': 'sent'}, format='json')
        res = self.client.put(f'{URL}{quote_id}/', self.payload(notes='Otro cambio'), format='json')
        self.assertEqual(res.status_code, 400)

    def test_editar_reemplaza_partidas(self):
        self.as_user(self.maker)
        quote_id = self.create()['id']
        items = [{'description': 'Solo esto', 'quantity': 1, 'unitPrice': 100, 'type': 'material'}]
        res = self.client.put(f'{URL}{quote_id}/', self.payload(items=items, tax=0), format='json')
        self.assertEqual([i['description'] for i in res.data['items']], ['Solo esto'])
        self.assertEqual(res.data['total'], 100.0)

    def test_viewer_no_crea_ni_cambia_estado(self):
        self.as_user(self.maker)
        quote_id = self.create()['id']
        self.as_user(self.viewer)
        self.assertEqual(self.client.post(URL, self.payload(), format='json').status_code, 403)
        res = self.client.post(f'{URL}{quote_id}/status/', {'status': 'sent'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_documento_imprimible(self):
        self.as_user(self.maker)
        quote_id = self.create()['id']
        res = self.client.get(f'{URL}{quote_id}/document/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['workshop']['name'], 'Taller Uno')
        self.assertEqual(res.data['client']['email'], 'cliente@correo.com')
