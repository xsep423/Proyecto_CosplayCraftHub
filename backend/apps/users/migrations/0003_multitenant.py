"""
Convierte el taller único (pk=1) en el primer tenant y asigna a todos los
usuarios existentes a ese taller. Así no se pierde nada de lo que ya había.
"""
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models
from django.utils.text import slugify


def assign_existing_data(apps, schema_editor):
    Workshop = apps.get_model('users', 'Workshop')
    Profile = apps.get_model('users', 'Profile')
    User = apps.get_model(*settings.AUTH_USER_MODEL.split('.'))

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
        ('users', '0002_workshop'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterModelOptions(name='workshop', options={'ordering': ['name']}),
        migrations.AddField(
            model_name='workshop',
            name='slug',
            field=models.SlugField(max_length=160, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='workshop',
            name='quote_prefix',
            field=models.CharField(default='CCH', max_length=10),
        ),
        migrations.AddField(
            model_name='workshop',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='workshop',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='profile',
            name='workshop',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='members', to='users.workshop',
            ),
        ),
        migrations.RunPython(assign_existing_data, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='workshop',
            name='slug',
            field=models.SlugField(max_length=160, unique=True),
        ),
        migrations.AlterField(
            model_name='workshop',
            name='name',
            field=models.CharField(max_length=150),
        ),
    ]
