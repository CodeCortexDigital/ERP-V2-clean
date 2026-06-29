"""
API v1 URL configuration.

Canonical examples:
  /api/v1/auth/login/
  /api/v1/students/
Legacy aliases (unchanged for clients):
  /api/v1/auth/students/
"""

from django.urls import path, include

from services.education.exams.views import get_exam_results
from services.core.backup.metrics import backup_metrics_view
from services.core.utils.cache import cache_metrics_view

urlpatterns = [
    path('health/', include('services.core.health.urls')),
    path('metrics/backup/', backup_metrics_view, name='v1-backup-metrics'),
    path('metrics/cache/', cache_metrics_view, name='v1-cache-metrics'),
    # Auth & identity
    path('auth/', include('services.core.accounts.urls')),
    path('auth/', include('services.core.audit_api.urls')),
    path('', include('services.core.audit_api.urls')),
    # Versioned resource paths (canonical)
    path('students/', include('api.v1.student_urls')),
    # Legacy nested paths (backward compatible)
    path('auth/students/', include('api.v1.student_urls')),
    path('auth/attendance/', include('services.education.attendance.urls')),
    path('auth/exams/', include('services.education.exams.urls')),
    path('auth/finance/', include('services.education.finance.urls')),
    path('auth/academics/', include('services.education.academics.urls')),
    path('auth/admissions/', include('services.education.admissions.urls')),
    path('auth/analytics/', include('services.analytics.urls')),
    path('search/', include('services.core.search.urls')),
    path('communication/whatsapp/', include('services.communication.whatsapp.urls')),
    path('core/audit/', include('services.core.audit.urls')),
    path('storage/', include('services.core.storage.urls')),
    path('tenants/', include('services.core.tenants.urls')),
    path('features/', include('services.core.features.urls')),
    path('education/', include('services.education.urls')),
    path('exams-results/', get_exam_results, name='v1-exams-results-direct'),
    # AI/ML routes
    path('ai/', include('services.analytics.ai_urls')),
]
