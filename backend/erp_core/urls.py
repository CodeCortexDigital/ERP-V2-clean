from django.contrib import admin
from django.urls import path, include, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "ok", "message": "Server is running"})

urlpatterns = [
    path('api/admissions/', include('services.education.admissions.urls')),
        path('api/attendance/', include('services.education.attendance.urls')),
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health'),
    path('api/auth/', include('services.core.accounts.urls')),
    path('api/academics/', include('services.education.academics.urls')),
    path('api/education/students/', include('services.education.students.urls')),
]



