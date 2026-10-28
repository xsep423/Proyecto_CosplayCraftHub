from django.urls import path

from .views import (
    PlatformMemberPasswordView,
    PlatformSummaryView,
    PlatformWorkshopDetailView,
    PlatformWorkshopListView,
)

urlpatterns = [
    path('summary/', PlatformSummaryView.as_view()),
    path('workshops/', PlatformWorkshopListView.as_view()),
    path('workshops/<int:pk>/', PlatformWorkshopDetailView.as_view()),
    path('workshops/<int:pk>/members/<int:user_id>/password/', PlatformMemberPasswordView.as_view()),
]
