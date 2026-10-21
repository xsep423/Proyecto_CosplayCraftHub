import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0004_cliente_workshop_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cliente',
            name='workshop',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='clientes', to='users.workshop',
            ),
        ),
        # El correo deja de ser único global y pasa a ser único por taller
        migrations.AlterField(
            model_name='cliente',
            name='correo',
            field=models.EmailField(max_length=254),
        ),
        migrations.AddConstraint(
            model_name='cliente',
            constraint=models.UniqueConstraint(
                fields=('workshop', 'correo'), name='cliente_correo_unico_por_taller'
            ),
        ),
    ]
