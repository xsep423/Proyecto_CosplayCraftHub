import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0002_cliente_ciudad_cliente_estado_and_more'),
        ('users', '0005_multitenant_constraints'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='workshop',
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name='clientes', to='users.workshop',
            ),
        ),
    ]
