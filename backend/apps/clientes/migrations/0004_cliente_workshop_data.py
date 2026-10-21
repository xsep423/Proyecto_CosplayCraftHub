from django.db import migrations

from apps.users.migration_utils import backfill_workshop


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0003_cliente_workshop'),
    ]

    operations = [
        migrations.RunPython(backfill_workshop('clientes', 'Cliente'), migrations.RunPython.noop),
    ]
