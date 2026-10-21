"""Multi-tenant, paso 3 de 3: slug único y nombre obligatorio."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_multitenant_data'),
    ]

    operations = [
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
