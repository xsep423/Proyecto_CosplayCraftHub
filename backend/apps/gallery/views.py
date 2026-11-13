from django.http import Http404, HttpResponse, HttpResponseRedirect
from django.views.decorators.http import require_GET

from .models import StoredImage

CACHE_FOREVER = 'public, max-age=31536000, immutable'


@require_GET
def serve_image(request, pk, variant='full'):
    """
    Sirve una imagen guardada en la base de datos. Es pública a propósito
    (las etiquetas <img> no mandan el token): el UUID no se puede adivinar.
    El contenido de un id nunca cambia, así que el navegador lo cachea para siempre.
    """
    field = 'thumb' if variant == 'thumb' else 'data'
    image = (
        StoredImage.objects.filter(pk=pk)
        .only('id', 'backend', 'content_type', 'remote_url', 'remote_thumb_url', field)
        .first()
    )
    if image is None:
        raise Http404

    if image.backend == StoredImage.Backend.CLOUDINARY:
        return HttpResponseRedirect(image.thumb_url if variant == 'thumb' else image.url)

    content = getattr(image, field) or image.data
    if content is None:
        raise Http404
    response = HttpResponse(bytes(content), content_type=image.content_type)
    response['Cache-Control'] = CACHE_FOREVER
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cross-Origin-Resource-Policy'] = 'cross-origin'
    return response
