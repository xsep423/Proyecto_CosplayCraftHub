from django.urls import path
from .views import LoginView, WorkshopView, UserListView, UserDetailView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('workshop/', WorkshopView.as_view()),
    path('users/', UserListView.as_view()),
    path('users/<int:pk>/', UserDetailView.as_view()),
]
