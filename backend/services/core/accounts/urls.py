from django.urls import path, include
from . import views
from . import views_auth

urlpatterns = [
    # Health check
    path('health/', views.health_check, name='health'),
    
    # Authentication
    path('login/', views.login_view, name='login'),
    path('me/', views.me, name='me'),
    path('logout/', views.logout_view, name='logout'),
    
    # Google OAuth
    path('google/', views_auth.google_login, name='google_login'),
    
    # Demo Account
    path('demo/', views_auth.demo_login, name='demo_login'),
    path('demo/status/', views_auth.demo_status, name='demo_status'),
    
    # Include education app endpoints
    path('students/', include('services.education.students.urls')),
    path('attendance/', include('services.education.attendance.urls')),
    path('classes/', include('services.education.academics.urls')),
    path('admissions/', include('services.education.admissions.urls')),
]
