from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import ClientOptionsView, QuoteViewSet

router = SimpleRouter()
router.register('', QuoteViewSet, basename='quote')

# 'clients/' va primero para que no lo tome el router como un id
urlpatterns = [path('clients/', ClientOptionsView.as_view())] + router.urls
