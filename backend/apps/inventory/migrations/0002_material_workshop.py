import django.db.models.deletion
from django.db import migrations, models

from apps.users.migration_utils import backfill_workshop


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0001_initial'),
        ('users', '0003_multitenant'),
    ]

    operations = [
        migrations.AddField(
            model_name='material',
            name='workshop',
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name='materials', to='users.workshop',
            ),
        ),
        migrations.RunPython(backfill_workshop('inventory', 'Material'), migrations.RunPython.noop),
        migrations.AlterField(
            model_name='material',
            name='workshop',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='materials', to='users.workshop',
            ),
        ),
    ]
