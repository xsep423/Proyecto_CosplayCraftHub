import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quotes', '0001_initial'),
        ('projects', '0001_initial'),
        ('users', '0005_multitenant_constraints'),
    ]

    operations = [
        migrations.AddField(
            model_name='quote',
            name='workshop',
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name='quotes', to='users.workshop',
            ),
        ),
        migrations.AddField(
            model_name='quote',
            name='seq',
            field=models.PositiveIntegerField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='quote',
            name='project',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name='quotes', to='projects.project',
            ),
        ),
    ]
