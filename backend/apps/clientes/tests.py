"""
Pruebas de clientes.

    python manage.py test apps.clientes
"""
from decimal import Decimal

from apps.quotes.models import Quote, QuoteItem
from apps.users.testutils import TenantAPITestCase, make_client, make_project

URL = '/api/clientes/'


class ClienteTests(TenantAPITestCase):
    def test_maker_crea_cliente_en_su_taller(self):
        self.as_user(self.maker)
        res = self.client.post(URL, {
            'name': 'Laura Gómez', 'email': 'laura@correo.com', 'phone': '555 123', 'city': 'Puebla',
            'workshop': self.other.pk,  # se ignora: el taller lo pone el servidor
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['name'], 'Laura Gómez')
        self.assertEqual(res.data['status'], 'active')
        self.assertTrue(self.workshop.clientes.filter(correo='laura@correo.com').exists())
        self.assertFalse(self.other.clientes.exists())

    def test_viewer_solo_puede_leer(self):
        make_client(self.workshop)
        self.as_user(self.viewer)
        self.assertEqual(self.client.get(URL).status_code, 200)
        res = self.client.post(URL, {'name': 'X', 'email': 'x@correo.com'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_solo_admin_elimina(self):
        cliente = make_client(self.workshop)
        self.as_user(self.maker)
        self.assertEqual(self.client.delete(f'{URL}{cliente.pk}/').status_code, 403)
        self.as_user(self.admin)
        self.assertEqual(self.client.delete(f'{URL}{cliente.pk}/').status_code, 204)

    def test_correo_unico_por_taller_pero_repetible_entre_talleres(self):
        make_client(self.workshop, email='repetido@correo.com')
        self.as_user(self.admin)
        res = self.client.post(URL, {'name': 'Otro', 'email': 'REPETIDO@correo.com'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.data)

        self.as_user(self.other_admin)
        res = self.client.post(URL, {'name': 'Otro', 'email': 'repetido@correo.com'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)

    def test_editar_sin_cambiar_correo_no_choca_consigo_mismo(self):
        cliente = make_client(self.workshop, email='yo@correo.com')
        self.as_user(self.maker)
        res = self.client.patch(f'{URL}{cliente.pk}/', {'email': 'yo@correo.com', 'city': 'León'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['city'], 'León')

    def test_cuenta_proyectos_y_total_aprobado(self):
        cliente = make_client(self.workshop)
        make_project(self.workshop, cliente)
        approved = Quote.objects.create(workshop=self.workshop, client=cliente, status='approved', tax=0)
        QuoteItem.objects.create(quote=approved, description='Casco', quantity=2, unit_price=Decimal('500'))
        draft = Quote.objects.create(workshop=self.workshop, client=cliente, status='draft', tax=0)
        QuoteItem.objects.create(quote=draft, description='No cuenta', quantity=1, unit_price=Decimal('9999'))

        self.as_user(self.viewer)
        data = self.client.get(f'{URL}{cliente.pk}/').data
        self.assertEqual(data['projects'], 1)
        self.assertEqual(data['totalSpent'], 1000.0)
