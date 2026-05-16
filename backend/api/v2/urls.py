"""
API v2 URL configuration — additive contracts; v1 remains available.

Canonical examples:
  /api/v2/auth/login/
  /api/v2/students/  (extended student fields)
"""

from django.urls import path, include

urlpatterns = [
    path('auth/', include('services.core.accounts.urls')),
    path('students/', include('api.v2.student_urls')),
    path('communication/whatsapp/', include('services.communication.whatsapp.urls')),
    path('tenants/', include('services.core.tenants.urls')),
    path('features/', include('services.core.features.urls')),
]
