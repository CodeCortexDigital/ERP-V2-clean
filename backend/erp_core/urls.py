from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from services.education.exams.views import get_exam_results

def health_check(request):
    return JsonResponse({"status": "ok", "message": "Server is running"})

urlpatterns = [
    path('api/exams-results/', get_exam_results, name='exams-results-direct'),
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health'),
    path('api/auth/', include('services.core.accounts.urls')),
    path('api/auth/exams/', include('services.education.exams.urls')),
    path('api/auth/finance/', include('services.education.finance.urls')),
    path('api/auth/academics/', include('services.education.academics.urls')),
    path('api/auth/admissions/', include('services.education.admissions.urls')),
    path('api/education/', include('services.education.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)










