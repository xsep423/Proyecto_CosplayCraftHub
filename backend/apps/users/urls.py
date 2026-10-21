from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    MemberOptionsView,
    RegisterWorkshopView,
    UserDetailView,
    UserListView,
    WorkshopView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterWorkshopView.as_view(), name='register_workshop'),
    path('workshop/', WorkshopView.as_view()),
    path('users/', UserListView.as_view()),
    path('users/<int:pk>/', UserDetailView.as_view()),
    path('members/', MemberOptionsView.as_view()),
]
