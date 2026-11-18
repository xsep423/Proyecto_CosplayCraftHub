from django.urls import path

from .views import DashboardSummaryView, NotificationsView

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('notifications/', NotificationsView.as_view(), name='notifications'),
]
