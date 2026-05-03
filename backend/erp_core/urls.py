from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'ok', 'service': 'clean-erp-v2'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check),
    path('api/auth/', include('auth_api.urls')),
]
