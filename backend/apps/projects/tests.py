"""
Pruebas de proyectos, tareas y materiales usados.

    python manage.py test apps.projects
"""
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.projects.models import Project, Task
from apps.users.testutils import TenantAPITestCase, make_client, make_material, make_project

URL = '/api/projects/'
TASKS = '/api/projects/tasks/'
MATERIALS = '/api/projects/materials/'


class ProjectApiTests(TenantAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.cliente = make_client(cls.workshop)
        cls.cliente_ajeno = make_client(cls.other, email='ajeno@correo.com')

    def payload(self, **extra):
        today = timezone.localdate()
        data = {
            'name': 'Armadura de Arthas', 'clientId': self.cliente.pk, 'status': 'planning',
            'priority': 'high', 'startDate': today.isoformat(),
            'dueDate': (today + timedelta(days=20)).isoformat(), 'budget': 8000,
            'tags': ['WoW', ' armadura ', 'WoW'],
        }
        data.update(extra)
        return data

    def test_crear_proyecto_limpia_etiquetas(self):
        self.as_user(self.maker)
        res = self.client.post(URL, self.payload(), format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['tags'], ['WoW', 'armadura'])
        self.assertEqual(Project.objects.get(pk=res.data['id']).workshop, self.workshop)

    def test_entrega_no_puede_ser_antes_del_inicio(self):
        self.as_user(self.maker)
        today = timezone.localdate()
        res = self.client.post(URL, self.payload(dueDate=(today - timedelta(days=1)).isoformat()), format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('dueDate', res.data)

    def test_no_acepta_cliente_de_otro_taller(self):
        self.as_user(self.maker)
        res = self.client.post(URL, self.payload(clientId=self.cliente_ajeno.pk), format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('clientId', res.data)

    def test_viewer_no_crea_y_maker_no_elimina(self):
        project = make_project(self.workshop, self.cliente)
        self.as_user(self.viewer)
        self.assertEqual(self.client.post(URL, self.payload(), format='json').status_code, 403)
        self.as_user(self.maker)
        self.assertEqual(self.client.delete(f'{URL}{project.pk}/').status_code, 403)

    def test_filtra_por_estado(self):
        make_project(self.workshop, self.cliente, name='A', status='in_progress')
        make_project(self.workshop, self.cliente, name='B', status='completed')
        self.as_user(self.viewer)
        names = [p['name'] for p in self.client.get(f'{URL}?status=completed').data]
        self.assertEqual(names, ['B'])

    def test_avance_segun_tareas(self):
        project = make_project(self.workshop, self.cliente)
        self.assertEqual(project.progress, 0)
        for i, status in enumerate(['done', 'done', 'todo', 'in_progress']):
            Task.objects.create(project=project, title=f'T{i}', status=status)
        self.assertEqual(project.progress, 50)
        project.status = 'completed'
        self.assertEqual(project.progress, 100)

    def test_tarea_no_se_mueve_a_otro_proyecto(self):
        a = make_project(self.workshop, self.cliente, name='A')
        b = make_project(self.workshop, self.cliente, name='B')
        task = Task.objects.create(project=a, title='Lijar')
        self.as_user(self.maker)
        res = self.client.patch(f'{TASKS}{task.pk}/', {'projectId': b.pk}, format='json')
        self.assertEqual(res.status_code, 400)


class ProjectMaterialTests(TenantAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.cliente = make_client(cls.workshop)

    def setUp(self):
        super().setUp()
        self.project = make_project(self.workshop, self.cliente, labor_cost=Decimal('1000'), other_cost=Decimal('50'))
        self.material = make_material(self.workshop, quantity=10, unit_cost=120)
        self.as_user(self.maker)

    def test_usar_material_descuenta_stock_y_suma_costo(self):
        res = self.client.post(MATERIALS, {
            'projectId': self.project.pk, 'materialId': self.material.pk, 'quantity': 4,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['subtotal'], 480.0)

        self.material.refresh_from_db()
        self.assertEqual(self.material.quantity, 6)
        self.assertEqual(self.material.movements.latest('created_at').delta, -4)

        data = self.client.get(f'{URL}{self.project.pk}/').data
        self.assertEqual(data['materialsCost'], 480.0)
        self.assertEqual(data['spent'], 1530.0)

    def test_guarda_el_costo_del_momento(self):
        self.client.post(MATERIALS, {
            'projectId': self.project.pk, 'materialId': self.material.pk, 'quantity': 1,
        }, format='json')
        self.material.unit_cost = Decimal('999')
        self.material.save()
        data = self.client.get(f'{URL}{self.project.pk}/').data
        self.assertEqual(data['materialsCost'], 120.0)

    def test_no_usa_mas_de_lo_que_hay(self):
        res = self.client.post(MATERIALS, {
            'projectId': self.project.pk, 'materialId': self.material.pk, 'quantity': 11,
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.material.refresh_from_db()
        self.assertEqual(self.material.quantity, 10)

    def test_quitar_material_regresa_el_stock(self):
        res = self.client.post(MATERIALS, {
            'projectId': self.project.pk, 'materialId': self.material.pk, 'quantity': 3,
        }, format='json')
        self.assertEqual(self.client.delete(f"{MATERIALS}{res.data['id']}/").status_code, 204)
        self.material.refresh_from_db()
        self.assertEqual(self.material.quantity, 10)
        self.assertTrue(self.material.movements.latest('created_at').reason.startswith('Devuelto de'))

    def test_no_usa_material_de_otro_taller(self):
        ajeno = make_material(self.other)
        res = self.client.post(MATERIALS, {
            'projectId': self.project.pk, 'materialId': ajeno.pk, 'quantity': 1,
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('materialId', res.data)
