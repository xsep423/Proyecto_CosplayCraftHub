"""Utilidades compartidas por las pruebas: crea talleres, usuarios y datos mínimos."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.inventory.models import Material
from apps.projects.models import Project
from apps.users.models import Profile, Workshop

PASSWORD = 'Prueba-Segura-2026'


def make_workshop(name='Taller Uno', **extra):
    return Workshop.objects.create(name=name, **extra)


def make_user(workshop, email, role='admin', name='Usuario Prueba'):
    first, _, last = name.partition(' ')
    user = User.objects.create_user(
        username=email, email=email, password=PASSWORD, first_name=first, last_name=last,
    )
    Profile.objects.update_or_create(user=user, defaults={'workshop': workshop, 'role': role})
    return user


def make_client(workshop, name='Cliente Prueba', email='cliente@correo.com', **extra):
    return Cliente.objects.create(workshop=workshop, nombre=name, correo=email, **extra)


def make_material(workshop, name='EVA Foam', quantity=10, unit_cost=100, min_stock=2, **extra):
    return Material.objects.create(
        workshop=workshop, name=name, category='Estructura', unit='plancha',
        quantity=Decimal(quantity), unit_cost=Decimal(unit_cost), min_stock=Decimal(min_stock), **extra
    )


def make_project(workshop, client, name='Armadura', due_in=30, **extra):
    today = timezone.localdate()
    data = {
        'start_date': today - timedelta(days=1),
        'due_date': today + timedelta(days=due_in),
        'budget': Decimal('5000'),
    }
    data.update(extra)
    return Project.objects.create(workshop=workshop, client=client, name=name, **data)


class TenantAPITestCase(APITestCase):
    """
    Dos talleres: `self.workshop` (con admin, maker y viewer) y `self.other`
    (con su propio admin), para probar permisos y aislamiento.
    """

    @classmethod
    def setUpTestData(cls):
        cls.workshop = make_workshop('Taller Uno')
        cls.admin = make_user(cls.workshop, 'admin@uno.test', 'admin', 'Ana Admin')
        cls.maker = make_user(cls.workshop, 'maker@uno.test', 'maker', 'Mario Maker')
        cls.viewer = make_user(cls.workshop, 'viewer@uno.test', 'viewer', 'Vera Viewer')
        cls.other = make_workshop('Taller Dos')
        cls.other_admin = make_user(cls.other, 'admin@dos.test', 'admin', 'Otro Admin')

    def setUp(self):
        cache.clear()  # reinicia el límite de peticiones anónimas

    def as_user(self, user):
        self.client.force_authenticate(user)
