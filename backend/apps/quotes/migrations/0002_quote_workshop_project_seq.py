import re

import django.db.models.deletion
from django.db import migrations, models

from apps.users.migration_utils import backfill_workshop


def fill_seq(apps, schema_editor):
    """Toma el consecutivo del folio existente (CCH-2026-007 -> 7)."""
    Quote = apps.get_model('quotes', 'Quote')
    for q in Quote.objects.filter(seq__isnull=True).order_by('pk'):
        match = re.search(r'(\d+)$', q.number or '')
        q.seq = int(match.group(1)) if match else q.pk
        q.save(update_fields=['seq'])


class Migration(migrations.Migration):

    dependencies = [
        ('quotes', '0001_initial'),
        ('projects', '0001_initial'),
        ('users', '0003_multitenant'),
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
        migrations.RunPython(backfill_workshop('quotes', 'Quote'), migrations.RunPython.noop),
        migrations.RunPython(fill_seq, migrations.RunPython.noop),
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
