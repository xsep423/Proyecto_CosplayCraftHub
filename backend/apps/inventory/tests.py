"""
Pruebas de inventario y movimientos de stock.

    python manage.py test apps.inventory
"""
from decimal import Decimal

from apps.inventory.models import Material, StockMovement
from apps.projects.models import ProjectMaterial
from apps.users.testutils import TenantAPITestCase, make_client, make_material, make_project

URL = '/api/inventory/materials/'


class StockRuleTests(TenantAPITestCase):
    def test_niveles_de_stock(self):
        cases = [(0, 10, 'out'), (4, 10, 'critical'), (7, 10, 'low'), (10, 10, 'ok'), (3, 0, 'ok')]
        for qty, minimum, expected in cases:
            m = Material(quantity=Decimal(qty), min_stock=Decimal(minimum))
            self.assertEqual(m.stock, expected, (qty, minimum))


class MaterialApiTests(TenantAPITestCase):
    def test_alta_registra_existencia_inicial(self):
        self.as_user(self.maker)
        res = self.client.post(URL, {
            'name': 'Worbla', 'category': 'Estructura', 'quantity': 5, 'unit': 'm²',
            'unitCost': 850, 'minStock': 2,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['stock'], 'ok')
        mov = StockMovement.objects.get(material_id=res.data['id'])
        self.assertEqual(mov.delta, 5)
        self.assertEqual(mov.reason, 'Existencia inicial')

    def test_viewer_no_puede_crear_ni_ajustar(self):
        material = make_material(self.workshop)
        self.as_user(self.viewer)
        self.assertEqual(self.client.post(URL, {}, format='json').status_code, 403)
        res = self.client.post(f'{URL}{material.pk}/adjust/', {'delta': 1}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_ajuste_suma_y_resta_con_historial(self):
        material = make_material(self.workshop, quantity=10)
        self.as_user(self.maker)
        res = self.client.post(f'{URL}{material.pk}/adjust/', {'delta': '-3.5', 'reason': 'Merma'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['quantity'], 6.5)
        mov = material.movements.latest('created_at')
        self.assertEqual((mov.delta, mov.quantity_after, mov.reason), (Decimal('-3.5'), Decimal('6.5'), 'Merma'))

    def test_ajuste_no_deja_stock_negativo(self):
        material = make_material(self.workshop, quantity=2)
        self.as_user(self.maker)
        res = self.client.post(f'{URL}{material.pk}/adjust/', {'delta': -5}, format='json')
        self.assertEqual(res.status_code, 400)
        material.refresh_from_db()
        self.assertEqual(material.quantity, 2)

    def test_ajuste_cero_es_invalido(self):
        material = make_material(self.workshop)
        self.as_user(self.maker)
        res = self.client.post(f'{URL}{material.pk}/adjust/', {'delta': 0}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_no_ajusta_material_de_otro_taller(self):
        ajeno = make_material(self.other)
        self.as_user(self.admin)
        res = self.client.post(f'{URL}{ajeno.pk}/adjust/', {'delta': 1}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_editar_cantidad_queda_en_historial(self):
        material = make_material(self.workshop, quantity=10)
        self.as_user(self.maker)
        res = self.client.patch(f'{URL}{material.pk}/', {'quantity': 12}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        mov = material.movements.latest('created_at')
        self.assertEqual((mov.delta, mov.reason), (Decimal('2'), 'Edición manual'))

    def test_no_se_elimina_material_usado_en_proyecto(self):
        material = make_material(self.workshop)
        project = make_project(self.workshop, make_client(self.workshop))
        ProjectMaterial.objects.create(project=project, material=material, quantity=1, unit_cost=100)
        self.as_user(self.admin)
        res = self.client.delete(f'{URL}{material.pk}/')
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Material.objects.filter(pk=material.pk).exists())
