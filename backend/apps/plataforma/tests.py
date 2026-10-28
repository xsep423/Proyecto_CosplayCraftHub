"""
Pruebas de la consola de plataforma (super admin).

    python manage.py test apps.plataforma
"""
from django.contrib.auth.models import User
from django.core.management import call_command
from rest_framework.test import APITestCase

from apps.users.models import Workshop

DEMO_PASSWORD = 'Demo1234!'
SUPER_EMAIL = 'super@plataforma.demo'
SUPER_PASSWORD = 'Plataforma-Segura-2026'


class PlatformConsoleTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_demo', stdout=open('/dev/null', 'w'))
        cls.forja = Workshop.objects.get(slug='forja-cosplay')
        cls.hilo = Workshop.objects.get(slug='hilo-espuma')
        User.objects.create_superuser('superadmin', SUPER_EMAIL, SUPER_PASSWORD)

    def login(self, email, password=DEMO_PASSWORD):
        res = self.client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return res.data

    # ---------- Acceso ----------

    def test_super_admin_entra_como_plataforma(self):
        data = self.login(SUPER_EMAIL, SUPER_PASSWORD)
        self.assertEqual(data['user']['role'], 'superadmin')
        self.assertIsNone(data['workshop'])

    def test_login_registra_ultimo_acceso(self):
        self.login('maker@forja.demo')
        self.client.credentials()
        self.login(SUPER_EMAIL, SUPER_PASSWORD)
        members = self.client.get(f'/api/platform/workshops/{self.forja.id}/').data['members']
        maker = next(m for m in members if m['email'] == 'maker@forja.demo')
        self.assertIsNotNone(maker['lastLogin'])

    def test_admin_de_taller_no_entra_a_la_consola(self):
        self.login('admin@forja.demo')
        for url in ['/api/platform/summary/', '/api/platform/workshops/',
                    f'/api/platform/workshops/{self.hilo.id}/']:
            self.assertEqual(self.client.get(url).status_code, 403, url)
        res = self.client.patch(f'/api/platform/workshops/{self.hilo.id}/', {'isActive': False}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_sin_sesion_no_entra(self):
        self.assertEqual(self.client.get('/api/platform/summary/').status_code, 401)

    def test_super_admin_no_lee_datos_de_negocio_por_las_rutas_de_taller(self):
        # La consola gestiona talleres; los datos de cada taller siguen aislados
        self.login(SUPER_EMAIL, SUPER_PASSWORD)
        for url in ['/api/clientes/', '/api/projects/', '/api/quotes/', '/api/dashboard/summary/']:
            self.assertEqual(self.client.get(url).status_code, 403, url)

    # ---------- Funciones ----------

    def test_resumen_y_lista_de_talleres(self):
        self.login(SUPER_EMAIL, SUPER_PASSWORD)
        summary = self.client.get('/api/platform/summary/').data
        self.assertEqual(summary['workshops'], 2)
        self.assertEqual(summary['users'], 5)
        rows = {w['slug']: w for w in self.client.get('/api/platform/workshops/').data}
        self.assertEqual(rows['forja-cosplay']['users'], 3)
        self.assertEqual(rows['forja-cosplay']['clients'], 4)
        self.assertEqual(rows['hilo-espuma']['projects'], 2)

    def test_desactivar_taller_bloquea_a_sus_usuarios(self):
        self.login('admin@forja.demo')
        self.assertEqual(self.client.get('/api/clientes/').status_code, 200)

        self.client.credentials()
        self.login(SUPER_EMAIL, SUPER_PASSWORD)
        res = self.client.patch(f'/api/platform/workshops/{self.forja.id}/', {'isActive': False}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['isActive'])

        self.client.credentials()
        res = self.client.post('/api/auth/login/', {'email': 'admin@forja.demo', 'password': DEMO_PASSWORD}, format='json')
        self.assertEqual(res.status_code, 400)
        # El otro taller sigue funcionando
        self.login('admin@hiloespuma.demo')
        self.assertEqual(self.client.get('/api/clientes/').status_code, 200)

    def test_alta_de_taller_desde_la_consola(self):
        self.login(SUPER_EMAIL, SUPER_PASSWORD)
        res = self.client.post('/api/platform/workshops/', {
            'workshopName': 'Taller Consola', 'ownerName': 'Ana Ruiz',
            'email': 'ana@consola.demo', 'password': 'UnaClaveSegura123',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['members'][0]['role'], 'admin')
        self.client.credentials()
        data = self.login('ana@consola.demo', 'UnaClaveSegura123')
        self.assertEqual(data['workshop']['name'], 'Taller Consola')

    def test_restablecer_contrasena_de_un_usuario(self):
        self.login(SUPER_EMAIL, SUPER_PASSWORD)
        maker = User.objects.get(email='maker@forja.demo')
        url = f'/api/platform/workshops/{self.forja.id}/members/{maker.id}/password/'
        self.assertEqual(self.client.post(url, {'password': '123'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, {'password': 'NuevaClave-Forja-77'}, format='json').status_code, 204)
        # El usuario no pertenece a ese otro taller: 404
        wrong = f'/api/platform/workshops/{self.hilo.id}/members/{maker.id}/password/'
        self.assertEqual(self.client.post(wrong, {'password': 'NuevaClave-Forja-77'}, format='json').status_code, 404)
        self.client.credentials()
        self.login('maker@forja.demo', 'NuevaClave-Forja-77')
