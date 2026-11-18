from django.urls import path

from .views import ExportView

urlpatterns = [
    path('<str:resource>/<str:fmt>/', ExportView.as_view(), name='export'),
]
