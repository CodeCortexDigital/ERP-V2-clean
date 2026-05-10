from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import views_auth
from . import firebase_views

urlpatterns = [
    # Health check
    path('health/', views.health_check, name='health'),
    
    # Authentication
    path('login/', views.login_view, name='login'),
    path('me/', views.me, name='me'),
    path('logout/', views.logout_view, name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Firebase / Google login
    path('firebase/login/', firebase_views.FirebaseLoginView.as_view(), name='firebase_login'),
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
