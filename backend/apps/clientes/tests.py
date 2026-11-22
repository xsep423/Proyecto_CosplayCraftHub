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


class MedidasClienteTests(TenantAPITestCase):
    def test_guarda_medidas_validas_y_fecha(self):
        cliente = make_client(self.workshop)
        self.as_user(self.maker)
        res = self.client.patch(f'{URL}{cliente.pk}/', {
            'measurements': {'busto': 92, 'cintura': '70.25', 'calzado': 25, 'cadera': ''},
            'measurementNotes': 'Prefiere el corsé holgado',
        }, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['measurements'], {'busto': 92.0, 'cintura': 70.2, 'calzado': 25.0})
        self.assertEqual(res.data['measurementNotes'], 'Prefiere el corsé holgado')
        self.assertIsNotNone(res.data['measurementsUpdatedAt'])

    def test_rechaza_medidas_desconocidas_o_fuera_de_rango(self):
        cliente = make_client(self.workshop)
        self.as_user(self.maker)
        for medidas in ({'alas': 50}, {'busto': -3}, {'busto': 900}, {'busto': 'mucho'}, ['busto']):
            res = self.client.patch(f'{URL}{cliente.pk}/', {'measurements': medidas}, format='json')
            self.assertEqual(res.status_code, 400, medidas)
            self.assertIn('measurements', res.data)
        cliente.refresh_from_db()
        self.assertEqual(cliente.medidas, {})

    def test_editar_otros_datos_no_cambia_fecha_de_medidas(self):
        cliente = make_client(self.workshop)
        self.as_user(self.maker)
        self.client.patch(f'{URL}{cliente.pk}/', {'measurements': {'altura': 170}}, format='json')
        cliente.refresh_from_db()
        fecha = cliente.medidas_actualizadas
        self.client.patch(f'{URL}{cliente.pk}/', {'city': 'León', 'measurements': {'altura': 170}}, format='json')
        cliente.refresh_from_db()
        self.assertEqual(cliente.medidas_actualizadas, fecha)

    def test_viewer_ve_medidas_pero_no_las_edita(self):
        cliente = make_client(self.workshop)
        cliente.medidas = {'cintura': 68.0}
        cliente.save()
        self.as_user(self.viewer)
        res = self.client.get(f'{URL}{cliente.pk}/')
        self.assertEqual(res.data['measurements'], {'cintura': 68.0})
        res = self.client.patch(f'{URL}{cliente.pk}/', {'measurements': {}}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_medidas_de_otro_taller_no_son_accesibles(self):
        cliente = make_client(self.other)
        self.as_user(self.admin)
        res = self.client.patch(f'{URL}{cliente.pk}/', {'measurements': {'busto': 90}}, format='json')
        self.assertEqual(res.status_code, 404)
