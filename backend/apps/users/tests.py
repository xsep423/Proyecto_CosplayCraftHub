"""
Pruebas de aislamiento multi-tenant.

    python manage.py test apps.users
"""
from django.core.management import call_command
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.inventory.models import Material
from apps.projects.models import Project, Task
from apps.quotes.models import Quote
from apps.users.models import Workshop

PASSWORD = 'Demo1234!'


class MultiTenantTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_demo', stdout=open('/dev/null', 'w'))
        cls.forja = Workshop.objects.get(slug='forja-cosplay')
        cls.hilo = Workshop.objects.get(slug='hilo-espuma')

    def login(self, email):
        res = self.client.post('/api/auth/login/', {'email': email, 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return res.data

    # ---------- Lectura ----------

    def test_login_devuelve_el_taller(self):
        data = self.login('admin@forja.demo')
        self.assertEqual(data['workshop']['id'], self.forja.id)

    def test_cada_taller_solo_ve_sus_datos(self):
        for email, workshop in [('admin@forja.demo', self.forja), ('admin@hiloespuma.demo', self.hilo)]:
            self.login(email)
            for url, model in [
                ('/api/clientes/', Cliente), ('/api/inventory/materials/', Material),
                ('/api/projects/', Project), ('/api/quotes/', Quote),
            ]:
                res = self.client.get(url)
                self.assertEqual(res.status_code, 200)
                ids = {item['id'] for item in res.data}
                expected = {str(pk) if url == '/api/clientes/' else pk
                            for pk in model.objects.filter(workshop=workshop).values_list('pk', flat=True)}
                self.assertEqual(ids, expected, url)

    def test_detalle_de_otro_taller_da_404(self):
        self.login('admin@forja.demo')
        ajenos = [
            f'/api/clientes/{Cliente.objects.filter(workshop=self.hilo).first().pk}/',
            f'/api/inventory/materials/{Material.objects.filter(workshop=self.hilo).first().pk}/',
            f'/api/projects/{Project.objects.filter(workshop=self.hilo).first().pk}/',
            f'/api/projects/tasks/{Task.objects.filter(project__workshop=self.hilo).first().pk}/',
            f'/api/quotes/{Quote.objects.filter(workshop=self.hilo).first().pk}/',
        ]
        for url in ajenos:
            self.assertEqual(self.client.get(url).status_code, 404, url)
            self.assertEqual(self.client.patch(url, {}, format='json').status_code, 404, url)

    def test_dashboard_solo_cuenta_datos_propios(self):
        self.login('admin@hiloespuma.demo')
        res = self.client.get('/api/dashboard/summary/')
        self.assertEqual(res.data['workshop']['id'], self.hilo.id)
        names = {p['name'] for p in res.data['upcoming']}
        self.assertTrue(names <= set(Project.objects.filter(workshop=self.hilo).values_list('name', flat=True)))

    def test_usuarios_solo_del_propio_taller(self):
        self.login('admin@forja.demo')
        emails = {u['email'] for u in self.client.get('/api/auth/users/').data}
        self.assertEqual(emails, {'admin@forja.demo', 'maker@forja.demo', 'viewer@forja.demo'})

    # ---------- Escritura ----------

    def test_no_se_puede_inyectar_otro_taller_al_crear(self):
        self.login('admin@forja.demo')
        res = self.client.post('/api/clientes/', {
            'name': 'Intruso', 'email': 'intruso@correo.com', 'workshop': self.hilo.id,
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Cliente.objects.get(correo='intruso@correo.com').workshop, self.forja)

    def test_no_se_puede_referenciar_cliente_ajeno(self):
        self.login('admin@forja.demo')
        cliente_ajeno = Cliente.objects.filter(workshop=self.hilo).first()
        res = self.client.post('/api/projects/', {
            'name': 'X', 'clientId': cliente_ajeno.pk, 'startDate': '2026-10-01',
            'dueDate': '2026-11-01', 'budget': 100, 'priority': 'low',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('clientId', res.data)

    def test_no_se_puede_usar_material_ajeno(self):
        self.login('admin@forja.demo')
        res = self.client.post('/api/projects/materials/', {
            'projectId': Project.objects.filter(workshop=self.forja).first().pk,
            'materialId': Material.objects.filter(workshop=self.hilo).first().pk,
            'quantity': 1,
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_mismo_correo_de_cliente_en_dos_talleres(self):
        # El seed ya tiene cliente.compartido@correo.com en ambos talleres
        self.assertEqual(Cliente.objects.filter(correo='cliente.compartido@correo.com').count(), 2)
        self.login('admin@forja.demo')
        res = self.client.post('/api/clientes/', {
            'name': 'Repetido', 'email': 'cliente.compartido@correo.com',
        }, format='json')
        self.assertEqual(res.status_code, 400)  # pero no repetido dentro del mismo taller

    def test_folio_de_cotizacion_por_taller(self):
        self.login('admin@hiloespuma.demo')
        cliente = Cliente.objects.filter(workshop=self.hilo).first()
        res = self.client.post('/api/quotes/', {
            'clientId': cliente.pk, 'discount': 0, 'tax': 16,
            'items': [{'description': 'x', 'quantity': 1, 'unitPrice': 10, 'type': 'material'}],
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data['number'].startswith('HYE-'))
        self.assertTrue(res.data['number'].endswith('-003'))

    def test_material_en_proyecto_descuenta_y_regresa_stock(self):
        self.login('maker@forja.demo')
        project = Project.objects.filter(workshop=self.forja, status='planning').first()
        material = Material.objects.get(workshop=self.forja, name='Tiras LED RGB 5V')
        before = material.quantity
        res = self.client.post('/api/projects/materials/', {
            'projectId': project.pk, 'materialId': material.pk, 'quantity': 2,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        material.refresh_from_db()
        self.assertEqual(material.quantity, before - 2)
        self.client.delete(f"/api/projects/materials/{res.data['id']}/")
        material.refresh_from_db()
        self.assertEqual(material.quantity, before)

    # ---------- Alta de tenant ----------

    def test_registro_de_nuevo_taller(self):
        res = self.client.post('/api/auth/register/', {
            'workshopName': 'Taller Nuevo', 'ownerName': 'Kevin Carretero',
            'email': 'kevin@nuevo.demo', 'password': 'UnaClaveSegura123',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        # Nace vacío: no ve nada de los otros talleres
        self.assertEqual(self.client.get('/api/clientes/').data, [])
        self.assertEqual(self.client.get('/api/projects/').data, [])
        self.assertEqual(self.client.get('/api/auth/workshop/').data['name'], 'Taller Nuevo')

    def test_viewer_no_puede_crear(self):
        self.login('viewer@forja.demo')
        res = self.client.post('/api/clientes/', {'name': 'X', 'email': 'x@correo.com'}, format='json')
        self.assertEqual(res.status_code, 403)
