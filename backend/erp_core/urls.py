from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from api.schema import (
    V1RedocView,
    V1SchemaView,
    V1SwaggerView,
    V2RedocView,
    V2SchemaView,
    V2SwaggerView,
)

urlpatterns = [
    # Direct management & audit aliases
    path('api/auth/', include('services.core.audit_api.urls')),
    # Versioned APIs (canonical)
    path('api/v1/', include(('api.v1.urls', 'api'), namespace='v1')),
    path('api/v2/', include(('api.v2.urls', 'api'), namespace='v2')),
    # Legacy unversioned prefix — behaves as v1
    path('api/', include(('api.v1.urls', 'api'), namespace='legacy')),
    # Per-version OpenAPI
    path('api/v1/schema/', V1SchemaView.as_view(), name='schema-v1'),
    path('api/v1/docs/', V1SwaggerView.as_view(url_name='schema-v1'), name='swagger-v1'),
    path('api/v1/redoc/', V1RedocView.as_view(url_name='schema-v1'), name='redoc-v1'),
    path('api/v2/schema/', V2SchemaView.as_view(), name='schema-v2'),
    path('api/v2/docs/', V2SwaggerView.as_view(url_name='schema-v2'), name='swagger-v2'),
    path('api/v2/redoc/', V2RedocView.as_view(url_name='schema-v2'), name='redoc-v2'),
    # Default schema points to v1 for backward compatibility
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('admin/', admin.site.urls),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)