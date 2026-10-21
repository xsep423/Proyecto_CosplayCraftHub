"""
Multi-tenant, paso 2 de 3: convierte el taller único (pk=1) en el primer tenant
y asigna a todos los usuarios existentes a ese taller.
"""
from django.conf import settings
from django.core.management.color import no_style
from django.db import migrations
from django.utils.text import slugify


def assign_existing_data(apps, schema_editor):
    Workshop = apps.get_model('users', 'Workshop')
    Profile = apps.get_model('users', 'Profile')
    User = apps.get_model(*settings.AUTH_USER_MODEL.split('.'))

    # Antes el taller se creaba con pk=1 fijo, así que en PostgreSQL el contador
    # de ids no avanzó. Se reinicia para que el siguiente taller no choque.
    for sql in schema_editor.connection.ops.sequence_reset_sql(no_style(), [Workshop]):
        schema_editor.execute(sql)

    if not Workshop.objects.exists() and User.objects.exists():
        Workshop.objects.create(name='Taller principal')

    used = set()
    for w in Workshop.objects.order_by('pk'):
        if not w.name:
            w.name = 'Taller principal'
        base = slugify(w.name) or 'taller'
        slug, n = base, 2
        while slug in used:
            slug, n = f'{base}-{n}', n + 1
        used.add(slug)
        w.slug = slug
        w.save(update_fields=['name', 'slug'])

    default = Workshop.objects.order_by('pk').first()
    if default is None:
        return
    for user in User.objects.all():
        profile, _ = Profile.objects.get_or_create(
            user=user, defaults={'role': 'admin' if user.is_superuser else 'viewer'}
        )
        if profile.workshop_id is None:
            profile.workshop = default
            profile.save(update_fields=['workshop'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_multitenant'),
    ]

    operations = [
        migrations.RunPython(assign_existing_data, migrations.RunPython.noop),
    ]
