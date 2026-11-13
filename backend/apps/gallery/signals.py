"""
Limpieza de imágenes:
- Al borrar un StoredImage (directo o en cascada al borrar un taller) se borra
  también su archivo en Cloudinary.
- Al borrar una foto de proyecto o un material, se borra su StoredImage.
Los borrados remotos esperan al commit para no perder archivos si la
transacción se revierte.
"""
from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import StoredImage
from .storage import delete_remote


@receiver(post_delete, sender=StoredImage)
def _delete_remote_file(sender, instance, **kwargs):
    transaction.on_commit(lambda: delete_remote(instance))


def _delete_linked_image(image_id):
    if image_id:
        StoredImage.objects.filter(pk=image_id).delete()


@receiver(post_delete, sender='projects.ProjectPhoto')
def _photo_deleted(sender, instance, **kwargs):
    _delete_linked_image(instance.image_id)


@receiver(post_delete, sender='inventory.Material')
def _material_deleted(sender, instance, **kwargs):
    _delete_linked_image(instance.image_id)
