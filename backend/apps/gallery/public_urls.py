from django.urls import path

from .public import PublicPortfolioView

urlpatterns = [
    path('<slug:slug>/', PublicPortfolioView.as_view(), name='public-portfolio'),
]
