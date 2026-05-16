"""Version-specific OpenAPI schema views."""

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

V1_SPECTACULAR_SETTINGS = {
    'TITLE': 'ERP V2 API — v1',
    'DESCRIPTION': (
        'Stable v1 contract. Deprecated 2026-05-16; sunset 2026-11-16. '
        'Migrate to /api/v2/. Fields are never removed; some are marked deprecated.'
    ),
    'VERSION': '1.0.0',
}

V2_SPECTACULAR_SETTINGS = {
    'TITLE': 'ERP V2 API — v2',
    'DESCRIPTION': (
        'Current API version. All v1 student fields are present; v2 adds '
        'display_label, tenant_code, current_class_name, current_section_name, '
        'enrollment_status, and api_version.'
    ),
    'VERSION': '2.0.0',
}


class V1SchemaView(SpectacularAPIView):
    custom_settings = V1_SPECTACULAR_SETTINGS


class V2SchemaView(SpectacularAPIView):
    custom_settings = V2_SPECTACULAR_SETTINGS


class V1SwaggerView(SpectacularSwaggerView):
    custom_settings = V1_SPECTACULAR_SETTINGS


class V2SwaggerView(SpectacularSwaggerView):
    custom_settings = V2_SPECTACULAR_SETTINGS


class V1RedocView(SpectacularRedocView):
    custom_settings = V1_SPECTACULAR_SETTINGS


class V2RedocView(SpectacularRedocView):
    custom_settings = V2_SPECTACULAR_SETTINGS
