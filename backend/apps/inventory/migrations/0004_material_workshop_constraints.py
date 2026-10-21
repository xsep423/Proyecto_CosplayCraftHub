import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_material_workshop_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='material',
            name='workshop',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='materials', to='users.workshop',
            ),
        ),
    ]
