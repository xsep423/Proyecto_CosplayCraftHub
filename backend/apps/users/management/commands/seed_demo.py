"""
Crea 2 talleres (tenants) de demostración con usuarios, clientes, inventario,
proyectos, tareas y cotizaciones.

    python manage.py seed_demo           # crea los talleres si no existen
    python manage.py seed_demo --reset   # los borra y los vuelve a crear

Ambos talleres comparten a propósito un cliente con el mismo correo
(cliente.compartido@correo.com) para demostrar que los datos están aislados.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.clientes.models import Cliente
from apps.inventory.models import Material, StockMovement
from apps.projects.models import Project, ProjectMaterial, Task
from apps.quotes.models import Quote, QuoteItem
from apps.users.models import Profile, Workshop

PASSWORD = 'Demo1234!'

TENANTS = [
    {
        'workshop': {
            'name': 'Forja Cosplay', 'slug': 'forja-cosplay', 'owner': 'Valeria Ortega',
            'email': 'contacto@forja.demo', 'phone': '664 123 4567', 'city': 'Tijuana',
            'bio': 'Armaduras, props y efectos LED.', 'quote_prefix': 'FRJ',
        },
        'users': [
            ('Valeria Ortega', 'admin@forja.demo', 'admin'),
            ('Tomás Ríos', 'maker@forja.demo', 'maker'),
            ('Lucía Pérez', 'viewer@forja.demo', 'viewer'),
        ],
        'clients': [
            ('Marco Delgado', 'marco.delgado@correo.com', 'Tijuana'),
            ('Ana Castillo', 'ana.castillo@correo.com', 'Ensenada'),
            ('Andrés Navarro', 'andres.navarro@correo.com', 'Mexicali'),
            ('Cliente Compartido', 'cliente.compartido@correo.com', 'Tijuana'),
        ],
        'materials': [
            ('EVA Foam 5mm', 'Estructura', 12, 'plancha', 120, 5, 'FoamMex', 'Estante A-1'),
            ('Worbla Thermoplastic', 'Estructura', 4, 'm²', 850, 3, 'CraftWorld', 'Estante A-2'),
            ('Spray Plateado Metálico', 'Pintura', 6, 'lata 400ml', 120, 4, 'ArteMex', 'Estante C-2'),
            ('Tiras LED RGB 5V', 'Electrónica', 10, 'm', 75, 5, 'ElectroParts', 'Cajón D-1'),
            ('Resina UV Transparente', 'Estructura', 1, 'frasco 500g', 450, 2, 'CraftWorld', 'Estante A-3'),
            ('Pegamento de Contacto', 'Adhesivos', 3, 'tubo 100ml', 55, 6, 'CosaMax', 'Estante E-2'),
        ],
        'projects': [
            {
                'name': 'Arthas Menethil – Lich King', 'client': 0, 'responsible': 0,
                'status': 'in_progress', 'priority': 'urgent', 'start': -30, 'due': 5,
                'budget': 8500, 'labor': 2400, 'other': 150, 'tags': ['WoW', 'armadura', 'LED'],
                'description': 'Armadura completa del Rey Exánime con casco y espada. EVA foam, worbla y LED.',
                'materials': [(0, 4), (1, 2), (3, 3)],
                'tasks': [
                    ('Diseñar patrón de armadura pectoral', 'done', 'high', 0),
                    ('Cortar piezas de EVA foam', 'done', 'high', 1),
                    ('Termomoldear casco', 'in_progress', 'urgent', 0),
                    ('Instalar tiras LED en casco', 'in_progress', 'high', 1),
                    ('Pintura base y detalles', 'todo', 'medium', 1),
                    ('Prueba final con el cliente', 'todo', 'medium', 0),
                ],
            },
            {
                'name': 'Geralt de Rivia – The Witcher', 'client': 2, 'responsible': 1,
                'status': 'review', 'priority': 'medium', 'start': -45, 'due': 12,
                'budget': 6800, 'labor': 3000, 'other': 0, 'tags': ['videojuego', 'armadura'],
                'description': 'Armadura de brujo con medallón y dos espadas.',
                'materials': [(0, 3), (2, 2)],
                'tasks': [
                    ('Armadura de cuero', 'done', 'high', 1),
                    ('Espadas de acero y plata', 'done', 'medium', 1),
                    ('Medallón de lobo', 'review', 'low', 0),
                ],
            },
            {
                'name': 'Luffy Gear 5 – One Piece', 'client': 1, 'responsible': 1,
                'status': 'planning', 'priority': 'high', 'start': 3, 'due': 40,
                'budget': 4200, 'labor': 0, 'other': 0, 'tags': ['anime'],
                'description': 'Traje blanco de Gear 5 con peluca y efectos de nube.',
                'materials': [],
                'tasks': [('Comprar tela stretch blanca', 'todo', 'high', 1)],
            },
        ],
        'quotes': [
            {'client': 0, 'project': 0, 'status': 'approved', 'items': [
                ('Materiales y estructura', 1, 3800, 'material'), ('Mano de obra', 40, 120, 'labor')]},
            {'client': 2, 'project': 1, 'status': 'sent', 'age': 10, 'items': [
                ('Armadura y accesorios', 1, 4200, 'material'), ('Mano de obra', 25, 120, 'labor')]},
            {'client': 3, 'project': None, 'status': 'draft', 'items': [
                ('Espada decorativa', 1, 1500, 'material')]},
        ],
    },
    {
        'workshop': {
            'name': 'Hilo & Espuma Studio', 'slug': 'hilo-espuma', 'owner': 'Camila Fuentes',
            'email': 'hola@hiloespuma.demo', 'phone': '33 9876 5432', 'city': 'Guadalajara',
            'bio': 'Confección de trajes, kimonos y pelucas.', 'quote_prefix': 'HYE',
        },
        'users': [
            ('Camila Fuentes', 'admin@hiloespuma.demo', 'admin'),
            ('Diego Morales', 'maker@hiloespuma.demo', 'maker'),
        ],
        'clients': [
            ('Sofía Reyes', 'sofia.reyes@correo.com', 'Guadalajara'),
            ('Elena Vásquez', 'elena.vasquez@correo.com', 'Zapopan'),
            ('Cliente Compartido', 'cliente.compartido@correo.com', 'Guadalajara'),
        ],
        'materials': [
            ('Tela Satín Negro', 'Tela', 15, 'm', 140, 5, 'Textiles García', 'Estante B-2'),
            ('Tela Velvet Morado', 'Tela', 0, 'm', 180, 3, 'Textiles García', 'Estante B-3'),
            ('Hilo de Costura Negro', 'Costura', 8, 'carrete', 35, 4, 'CosaMax', 'Estante E-1'),
            ('Peluca Blanca Larga', 'Accesorios', 3, 'pieza', 280, 1, 'WigWorld', 'Caja F-1'),
        ],
        'projects': [
            {
                'name': 'Nezuko Kamado – Kimetsu', 'client': 0, 'responsible': 0,
                'status': 'in_progress', 'priority': 'medium', 'start': -20, 'due': 15,
                'budget': 3200, 'labor': 1200, 'other': 80, 'tags': ['anime', 'kimono'],
                'description': 'Kimono con patrón asanoha, cesta de bambú y maquillaje.',
                'materials': [(0, 4), (2, 2)],
                'tasks': [
                    ('Patronaje del kimono', 'done', 'high', 0),
                    ('Costura del kimono', 'in_progress', 'high', 1),
                    ('Cesta de bambú', 'todo', 'medium', 1),
                ],
            },
            {
                'name': '2B – NieR:Automata', 'client': 1, 'responsible': 1,
                'status': 'in_progress', 'priority': 'high', 'start': -10, 'due': -2,
                'budget': 7200, 'labor': 2000, 'other': 0, 'tags': ['videojuego', 'vestido'],
                'description': 'Vestido negro, venda, peluca blanca y espadas.',
                'materials': [(3, 1)],
                'tasks': [
                    ('Vestido', 'review', 'high', 0),
                    ('Espadas gemelas', 'todo', 'urgent', 1),
                ],
            },
        ],
        'quotes': [
            {'client': 0, 'project': 0, 'status': 'invoiced', 'items': [
                ('Kimono completo', 1, 2600, 'material'), ('Mano de obra', 10, 100, 'labor')]},
            {'client': 2, 'project': None, 'status': 'sent', 'age': 3, 'items': [
                ('Capa con forro', 1, 1900, 'material')]},
        ],
    },
]


class Command(BaseCommand):
    help = 'Crea 2 talleres de demostración (multi-tenant) con datos.'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Borra y recrea los talleres demo.')

    @transaction.atomic
    def handle(self, *args, **options):
        slugs = [t['workshop']['slug'] for t in TENANTS]
        emails = [u[1] for t in TENANTS for u in t['users']]

        if options['reset']:
            for w in Workshop.objects.filter(slug__in=slugs):
                # PROTECT: primero lo que apunta a clientes y materiales
                Quote.objects.filter(workshop=w).delete()
                Project.objects.filter(workshop=w).delete()
                w.delete()
            User.objects.filter(email__in=emails).delete()

        for tenant in TENANTS:
            if Workshop.objects.filter(slug=tenant['workshop']['slug']).exists():
                self.stdout.write(f"Ya existe: {tenant['workshop']['name']} (usa --reset para recrearlo)")
                continue
            self.create_tenant(tenant)
            self.stdout.write(self.style.SUCCESS(f"Creado: {tenant['workshop']['name']}"))

        self.stdout.write('')
        self.stdout.write(f'Contraseña de todos los usuarios demo: {PASSWORD}')
        for tenant in TENANTS:
            for name, email, role in tenant['users']:
                self.stdout.write(f"  {tenant['workshop']['name']:<22} {role:<7} {email}")

    def create_tenant(self, data):
        today = timezone.localdate()
        workshop = Workshop.objects.create(**data['workshop'])

        users = []
        for name, email, role in data['users']:
            first, _, last = name.partition(' ')
            user = User.objects.create_user(
                username=email, email=email, password=PASSWORD, first_name=first, last_name=last
            )
            Profile.objects.update_or_create(user=user, defaults={'workshop': workshop, 'role': role})
            users.append(user)

        clients = []
        for name, email, city in data['clients']:
            first, _, last = name.partition(' ')
            clients.append(Cliente.objects.create(
                workshop=workshop, nombre=first, apellidos=last, correo=email, ciudad=city,
            ))

        materials = []
        for name, cat, qty, unit, cost, min_stock, supplier, location in data['materials']:
            m = Material.objects.create(
                workshop=workshop, name=name, category=cat, quantity=qty, unit=unit,
                unit_cost=cost, min_stock=min_stock, supplier=supplier, location=location,
            )
            if qty:
                StockMovement.objects.create(
                    material=m, delta=qty, quantity_after=qty, reason='Existencia inicial', user=users[0]
                )
            materials.append(m)

        projects = []
        for p in data['projects']:
            project = Project.objects.create(
                workshop=workshop, client=clients[p['client']], responsible=users[p['responsible']],
                name=p['name'], description=p['description'], status=p['status'],
                priority=p['priority'], start_date=today + timedelta(days=p['start']),
                due_date=today + timedelta(days=p['due']), budget=p['budget'],
                labor_cost=p['labor'], other_cost=p['other'], tags=p['tags'],
            )
            for i, (title, status, priority, assignee) in enumerate(p['tasks']):
                Task.objects.create(
                    project=project, title=title, status=status, priority=priority,
                    assignee=users[assignee], due_date=project.due_date - timedelta(days=len(p['tasks']) - i),
                )
            for idx, qty in p['materials']:
                m = materials[idx]
                qty = Decimal(qty)
                m.quantity -= qty
                m.save(update_fields=['quantity'])
                StockMovement.objects.create(
                    material=m, delta=-qty, quantity_after=m.quantity,
                    reason=f'Proyecto: {project.name}'[:100], user=users[0],
                )
                ProjectMaterial.objects.create(project=project, material=m, quantity=qty, unit_cost=m.unit_cost)
            projects.append(project)

        for q in data['quotes']:
            project = projects[q['project']] if q['project'] is not None else None
            quote = Quote.objects.create(
                workshop=workshop, client=clients[q['client']], project=project,
                project_name=project.name if project else '', status=q['status'],
                tax=workshop.tax_rate, created_by=users[0],
            )
            QuoteItem.objects.bulk_create([
                QuoteItem(quote=quote, description=d, quantity=qty, unit_price=price, type=t)
                for d, qty, price, t in q['items']
            ])
            if q.get('age'):
                # Simula una cotización enviada hace varios días (genera alerta en el dashboard)
                Quote.objects.filter(pk=quote.pk).update(
                    updated_at=timezone.now() - timedelta(days=q['age'])
                )
