from django.urls import path
from . import views
from . import views_auth

urlpatterns = [
    
    
    path('health/', views.health_check, name='health'),
    path('login/', views.login_view, name='login'),
    path('me/', views.me, name='me'),
    path('logout/', views.logout_view, name='logout'),
    path('google/', views_auth.google_login, name='google_login'),
    path('demo/', views_auth.demo_login, name='demo_login'),
    path('demo/status/', views_auth.demo_status, name='demo_status'),
    path('students/', views.StudentListCreateView.as_view(), name='student-list'),
    path('students/<uuid:pk>/', views.StudentDetailView.as_view(), name='student-detail'),
]





