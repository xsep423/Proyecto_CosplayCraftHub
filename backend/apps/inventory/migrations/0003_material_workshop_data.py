from django.db import migrations

from apps.users.migration_utils import backfill_workshop


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0002_material_workshop'),
    ]

    operations = [
        migrations.RunPython(backfill_workshop('inventory', 'Material'), migrations.RunPython.noop),
    ]
