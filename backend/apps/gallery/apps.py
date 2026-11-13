from django.apps import AppConfig


class GalleryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.gallery'
    verbose_name = 'Imágenes'

    def ready(self):
        from . import signals  # noqa: F401
