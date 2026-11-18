"""
Pruebas del dashboard y de las notificaciones.

    python manage.py test apps.dashboard
"""
from datetime import timedelta

from django.utils import timezone

from apps.dashboard.alerts import build_alerts
from apps.quotes.models import Quote
from apps.users.testutils import TenantAPITestCase, make_client, make_material, make_project


class AlertTests(TenantAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.cliente = make_client(cls.workshop)

    def test_alertas_de_stock_entregas_y_cotizaciones(self):
        agotado = make_material(self.workshop, name='Agotado', quantity=0, min_stock=5)
        make_material(self.workshop, name='Suficiente', quantity=50, min_stock=5)
        bajo = make_material(self.workshop, name='Bajo', quantity=4, min_stock=5)
        vencido = make_project(self.workshop, self.cliente, name='Vencido', due_in=-3, start_date=timezone.localdate() - timedelta(days=10))
        pronto = make_project(self.workshop, self.cliente, name='Pronto', due_in=2)
        make_project(self.workshop, self.cliente, name='Lejano', due_in=60)
        make_project(self.workshop, self.cliente, name='Terminado', due_in=-3, status='completed',
                     start_date=timezone.localdate() - timedelta(days=10))
        quote = Quote.objects.create(workshop=self.workshop, client=self.cliente, status='sent')
        Quote.objects.filter(pk=quote.pk).update(updated_at=timezone.now() - timedelta(days=10))

        self.as_user(self.viewer)
        res = self.client.get('/api/dashboard/notifications/')
        self.assertEqual(res.status_code, 200)
        by_id = {a['id']: a for a in res.data}

        self.assertEqual(by_id[f'stock-{agotado.pk}-out']['type'], 'danger')
        self.assertEqual(by_id[f'stock-{bajo.pk}-low']['type'], 'warning')
        self.assertIn('vencida hace 3 días', by_id[f'project-{vencido.pk}-overdue']['text'])
        soon = next(a for a in res.data if a['id'].startswith(f'project-{pronto.pk}-soon'))
        self.assertIn('entrega en 2 días', soon['text'])
        self.assertIn(f'quote-{quote.pk}-stale', by_id)
        texts = ' '.join(a['text'] for a in res.data)
        self.assertNotIn('Suficiente', texts)
        self.assertNotIn('Lejano', texts)
        self.assertNotIn('Terminado', texts)

    def test_entrega_hoy(self):
        p = make_project(self.workshop, self.cliente, name='Hoy', due_in=0)
        alerts = build_alerts([p], [], [])
        self.assertEqual(alerts[0]['text'], 'Hoy: entrega hoy')

    def test_el_id_cambia_si_empeora_el_stock(self):
        m = make_material(self.workshop, quantity=4, min_stock=5)
        before = build_alerts([], [m], [])[0]['id']
        m.quantity = 0
        after = build_alerts([], [m], [])[0]['id']
        self.assertNotEqual(before, after)

    def test_notificaciones_solo_del_propio_taller(self):
        make_material(self.other, name='Ajeno', quantity=0, min_stock=5)
        self.as_user(self.admin)
        self.assertEqual(self.client.get('/api/dashboard/notifications/').data, [])

    def test_sin_sesion_no_hay_notificaciones(self):
        self.assertEqual(self.client.get('/api/dashboard/notifications/').status_code, 401)


class DashboardSummaryTests(TenantAPITestCase):
    def test_resumen(self):
        cliente = make_client(self.workshop)
        make_project(self.workshop, cliente, status='in_progress', due_in=3)
        make_material(self.workshop, quantity=0, min_stock=2)
        self.as_user(self.viewer)
        data = self.client.get('/api/dashboard/summary/').data
        self.assertEqual(data['stats']['activeProjects'], 1)
        self.assertEqual(data['stats']['stockAlerts'], 1)
        self.assertEqual(data['projectsByStatus']['in_progress'], 1)
        self.assertEqual(len(data['alerts']), 2)
        self.assertTrue(all('id' in a for a in data['alerts']))
