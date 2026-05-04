from django.urls import path
from . import views
from . import views_auth

urlpatterns = [
    path('health/', views.health_check, name='health'),
    path('login/', views.login_view, name='login'),
    path('me/', views.me, name='me'),
    path('google/', views_auth.google_login, name='google_login'),
    path('demo/', views_auth.demo_login, name='demo_login'),
    path('demo/status/', views_auth.demo_status, name='demo_status'),
]
