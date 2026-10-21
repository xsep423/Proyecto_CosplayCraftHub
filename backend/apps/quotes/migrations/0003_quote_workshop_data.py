import re

from django.db import migrations

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
        ('quotes', '0002_quote_workshop_project_seq'),
    ]

    operations = [
        migrations.RunPython(backfill_workshop('quotes', 'Quote'), migrations.RunPython.noop),
        migrations.RunPython(fill_seq, migrations.RunPython.noop),
    ]
