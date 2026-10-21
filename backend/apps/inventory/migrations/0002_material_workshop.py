import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0001_initial'),
        ('users', '0005_multitenant_constraints'),
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
    ]
