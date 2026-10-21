"""Ayudas para las migraciones de datos que agregan la columna workshop."""


def default_workshop(apps):
    """Primer taller; si no existe, crea 'Taller principal'."""
    Workshop = apps.get_model('users', 'Workshop')
    workshop = Workshop.objects.order_by('pk').first()
    if workshop is None:
        slug, n = 'taller-principal', 2
        while Workshop.objects.filter(slug=slug).exists():
            slug, n = f'taller-principal-{n}', n + 1
        workshop = Workshop.objects.create(name='Taller principal', slug=slug)
    return workshop


def backfill_workshop(app_label, model_name):
    """Devuelve una función RunPython que asigna el taller por defecto a los registros sin taller."""
    def run(apps, schema_editor):
        Model = apps.get_model(app_label, model_name)
        pending = Model.objects.filter(workshop__isnull=True)
        if pending.exists():
            pending.update(workshop=default_workshop(apps))
    return run
