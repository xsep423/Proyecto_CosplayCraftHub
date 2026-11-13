from django.urls import path

from .views import serve_image

urlpatterns = [
    path('<uuid:pk>/', serve_image, name='media-image'),
    path('<uuid:pk>/thumb/', serve_image, {'variant': 'thumb'}, name='media-thumb'),
]
