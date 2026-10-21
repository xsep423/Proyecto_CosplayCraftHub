import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quotes', '0003_quote_workshop_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='quote',
            name='workshop',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='quotes', to='users.workshop',
            ),
        ),
        # El folio deja de ser único global y pasa a ser único por taller
        migrations.AlterField(
            model_name='quote',
            name='number',
            field=models.CharField(blank=True, editable=False, max_length=30, null=True),
        ),
        migrations.AddConstraint(
            model_name='quote',
            constraint=models.UniqueConstraint(
                fields=('workshop', 'number'), name='quote_folio_unico_por_taller'
            ),
        ),
    ]
