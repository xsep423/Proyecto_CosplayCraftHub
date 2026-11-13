import uuid

from django.db import models


class StoredImage(models.Model):
    """
    Una imagen ya procesada (redimensionada, en WebP y sin metadatos EXIF).

    Se guarda en uno de dos lugares, según cómo esté configurado el servidor
    cuando se sube (ver apps/gallery/storage.py):
    - 'db': los bytes viven en esta misma fila (columnas data y thumb).
    - 'cloudinary': los bytes viven en Cloudinary; aquí solo quedan las URLs.

    Cada imagen recuerda su backend, así que se puede cambiar de uno a otro sin
    romper las imágenes que ya existían.

    El id es un UUID: las URLs de las imágenes son públicas (las usan las
    etiquetas <img> y el portafolio), así que no deben poder adivinarse.
    """

    class Backend(models.TextChoices):
        DATABASE = 'db', 'Base de datos'
        CLOUDINARY = 'cloudinary', 'Cloudinary'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workshop = models.ForeignKey(
        'users.Workshop', on_delete=models.CASCADE, related_name='images'
    )
    backend = models.CharField(max_length=12, choices=Backend.choices)
    content_type = models.CharField(max_length=30, default='image/webp')
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    size = models.PositiveIntegerField(default=0, help_text='Bytes de la imagen completa')
    # Backend 'db'
    data = models.BinaryField(null=True, blank=True, editable=False)
    thumb = models.BinaryField(null=True, blank=True, editable=False)
    # Backend 'cloudinary'
    remote_id = models.CharField(max_length=255, blank=True)
    remote_url = models.URLField(max_length=500, blank=True)
    remote_thumb_url = models.URLField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    # Columnas con los bytes: no se cargan al listar, solo al servir la imagen
    HEAVY_FIELDS = ('data', 'thumb')

    @property
    def url(self):
        if self.backend == self.Backend.CLOUDINARY:
            return self.remote_url
        return f'/api/media/{self.id}/'

    @property
    def thumb_url(self):
        if self.backend == self.Backend.CLOUDINARY:
            return self.remote_thumb_url or self.remote_url
        return f'/api/media/{self.id}/thumb/'

    def __str__(self):
        return f'{self.get_backend_display()} · {self.id}'


def light_image(pk):
    """Carga un StoredImage sin sus bytes (para mostrar su URL)."""
    if not pk:
        return None
    return StoredImage.objects.defer(*StoredImage.HEAVY_FIELDS).filter(pk=pk).first()


def image_payload(image):
    """Lo que el frontend necesita de una imagen (o None)."""
    if image is None:
        return None
    return {
        'id': str(image.id),
        'url': image.url,
        'thumbUrl': image.thumb_url,
        'width': image.width,
        'height': image.height,
    }
