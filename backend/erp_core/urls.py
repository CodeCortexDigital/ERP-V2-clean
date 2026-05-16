from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from services.education.exams.views import get_exam_results

api_v1_patterns = [
    path('health/', include('services.core.health.urls')),
    path('auth/', include('services.core.accounts.urls')),
    path('auth/students/', include('services.education.students.urls')),
    path('auth/attendance/', include('services.education.attendance.urls')),
    path('auth/exams/', include('services.education.exams.urls')),
    path('auth/finance/', include('services.education.finance.urls')),
    path('auth/academics/', include('services.education.academics.urls')),
    path('auth/admissions/', include('services.education.admissions.urls')),
    path('auth/analytics/', include('services.analytics.urls')),
    path('core/audit/', include('services.core.audit.urls')),
    path('education/', include('services.education.urls')),
    path('exams-results/', get_exam_results, name='exams-results-direct'),
]

urlpatterns = [
    path('api/v1/', include((api_v1_patterns, 'api'), namespace='v1')),
    path('api/', include((api_v1_patterns, 'api'), namespace='legacy')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('admin/', admin.site.urls),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)










