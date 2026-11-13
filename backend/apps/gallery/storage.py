"""
Procesamiento y almacenamiento de imágenes.

Toda imagen subida pasa por process_upload():
- solo se aceptan JPEG, PNG, WebP y GIF de hasta MAX_UPLOAD_BYTES;
- se corrige la orientación de las fotos de celular;
- se eliminan los metadatos EXIF (ubicación GPS, modelo del teléfono, etc.);
- se reduce a MAX_SIDE px en su lado mayor y se genera una miniatura;
- se guarda como WebP (conserva transparencia, pesa poco).

Dónde se guarda lo decide settings.IMAGE_STORAGE:
- 'cloudinary' si existe CLOUDINARY_URL;
- 'db' (PostgreSQL) en cualquier otro caso.
El disco del servidor nunca se usa: en Render gratis se borra en cada deploy.
"""
import io
import logging
from urllib.parse import urlparse

from django.conf import settings
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

from .models import StoredImage

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_SIDE = 1600
THUMB_SIDE = 480
QUALITY = 82
ALLOWED_FORMATS = {'JPEG', 'MPO', 'PNG', 'WEBP', 'GIF'}

# Protege contra "bombas de descompresión" (imágenes pequeñas en bytes pero
# enormes en píxeles). 60 MP cubre de sobra cualquier foto de celular.
Image.MAX_IMAGE_PIXELS = 60_000_000


def _encode(img):
    buf = io.BytesIO()
    img.save(buf, format='WEBP', quality=QUALITY, method=4)
    return buf.getvalue()


def process_upload(file):
    """Valida y procesa un archivo subido. Devuelve (full, thumb, width, height)."""
    if file is None:
        raise ValidationError({'file': 'Selecciona una imagen.'})
    if file.size > MAX_UPLOAD_BYTES:
        raise ValidationError({'file': 'La imagen pesa más de 10 MB.'})

    try:
        img = Image.open(file)
        if img.format not in ALLOWED_FORMATS:
            raise ValidationError({'file': 'Formato no soportado. Usa JPG, PNG, WebP o GIF.'})
        # Para JPEG, decodifica directo a menor resolución: mucho más rápido y con menos memoria
        if img.format in ('JPEG', 'MPO'):
            img.draft('RGB', (MAX_SIDE * 2, MAX_SIDE * 2))
        img.load()
    except ValidationError:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError):
        raise ValidationError({'file': 'El archivo no es una imagen válida o es demasiado grande.'})

    # Las fotos de celular traen la rotación en EXIF; se aplica antes de quitarlo
    img = ImageOps.exif_transpose(img)
    has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
    img = img.convert('RGBA' if has_alpha else 'RGB')

    full = img.copy()
    full.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    thumb = img.copy()
    thumb.thumbnail((THUMB_SIDE, THUMB_SIDE), Image.Resampling.LANCZOS)

    # Al crear imágenes nuevas desde los píxeles no se copia ningún metadato
    return _encode(full), _encode(thumb), full.width, full.height


# ---------------------------------------------------------------------------
# Cloudinary
# ---------------------------------------------------------------------------

_cloudinary_ready = False


def _cloudinary():
    """Configura el SDK con settings.CLOUDINARY_URL (cloudinary://key:secret@cloud)."""
    global _cloudinary_ready
    import cloudinary
    import cloudinary.uploader

    if not _cloudinary_ready:
        parsed = urlparse(settings.CLOUDINARY_URL)
        cloudinary.config(
            cloud_name=parsed.hostname,
            api_key=parsed.username,
            api_secret=parsed.password,
            secure=True,
        )
        _cloudinary_ready = True
    return cloudinary


def _thumb_from_url(url):
    """Miniatura de Cloudinary: misma imagen con una transformación en la URL."""
    marker = '/image/upload/'
    if marker not in url:
        return url
    return url.replace(marker, f'{marker}c_limit,w_{THUMB_SIDE},h_{THUMB_SIDE}/', 1)


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

def current_backend():
    return settings.IMAGE_STORAGE


def save_upload(workshop, file, folder='general'):
    """Procesa el archivo y lo guarda en el backend configurado. Devuelve el StoredImage."""
    full, thumb, width, height = process_upload(file)
    image = StoredImage(
        workshop=workshop,
        backend=current_backend(),
        content_type='image/webp',
        width=width,
        height=height,
        size=len(full),
    )

    if image.backend == StoredImage.Backend.CLOUDINARY:
        cloudinary = _cloudinary()
        try:
            result = cloudinary.uploader.upload(
                io.BytesIO(full),
                folder=f'cosplaycrafthub/{workshop.slug}/{folder}',
                public_id=str(image.id),
                resource_type='image',
                overwrite=False,
            )
        except Exception:
            logger.exception('Error al subir imagen a Cloudinary')
            raise ValidationError({'file': 'No se pudo subir la imagen. Intenta de nuevo.'})
        image.remote_id = result['public_id']
        image.remote_url = result['secure_url']
        image.remote_thumb_url = _thumb_from_url(result['secure_url'])
    else:
        image.data = full
        image.thumb = thumb

    image.save()
    return image


def delete_remote(image):
    """Borra el archivo de Cloudinary. Un fallo aquí no debe impedir borrar el registro."""
    if image.backend != StoredImage.Backend.CLOUDINARY or not image.remote_id:
        return
    if not settings.CLOUDINARY_URL:
        logger.warning('CLOUDINARY_URL no está configurada; no se borró %s', image.remote_id)
        return
    try:
        _cloudinary().uploader.destroy(image.remote_id, resource_type='image', invalidate=True)
    except Exception:
        logger.exception('No se pudo borrar de Cloudinary: %s', image.remote_id)
