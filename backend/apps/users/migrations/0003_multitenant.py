"""
Multi-tenant, paso 1 de 3: agrega las columnas nuevas (todas opcionales).

Se separa en 3 migraciones porque PostgreSQL no permite cambiar datos y luego
crear índices/restricciones dentro de la misma transacción.
"""
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_workshop'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterModelOptions(name='workshop', options={'ordering': ['name']}),
        migrations.AddField(
            model_name='workshop',
            name='slug',
            # Sin índice aquí: en PostgreSQL el índice "_like" se crea al volverlo único
            # más abajo; si se crea dos veces la migración falla.
            field=models.SlugField(max_length=160, null=True, blank=True, db_index=False),
        ),
        migrations.AddField(
            model_name='workshop',
            name='quote_prefix',
            field=models.CharField(default='CCH', max_length=10),
        ),
        migrations.AddField(
            model_name='workshop',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='workshop',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='profile',
            name='workshop',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='members', to='users.workshop',
            ),
        ),
    ]
