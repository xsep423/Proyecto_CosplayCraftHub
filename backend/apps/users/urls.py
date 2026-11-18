from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    MemberOptionsView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterWorkshopView,
    UserDetailView,
    UserListView,
    WorkshopLogoView,
    WorkshopView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('register/', RegisterWorkshopView.as_view(), name='register_workshop'),
    path('workshop/', WorkshopView.as_view()),
    path('workshop/logo/', WorkshopLogoView.as_view()),
    path('users/', UserListView.as_view()),
    path('users/<int:pk>/', UserDetailView.as_view()),
    path('members/', MemberOptionsView.as_view()),
]
