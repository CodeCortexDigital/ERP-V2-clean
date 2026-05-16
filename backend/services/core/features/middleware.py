"""
Attach resolved feature flags to each request and return 404 for disabled gated routes.
"""

from __future__ import annotations

from django.http import JsonResponse

from .services import resolve_all_features

# Longest prefixes first so more specific rules win.
FEATURE_ROUTE_PREFIXES: list[tuple[str, str]] = [
    ('whatsapp_integration', '/auth/finance/communication/defaulter-whatsapp'),
    ('whatsapp_integration', '/auth/finance/communication/bulk-reminders'),
    ('online_payments', '/auth/finance/payments/session/'),
    ('online_payments', '/auth/finance/payments/webhook/'),
    ('online_payments', '/auth/finance/payment-gateways/'),
    ('online_payments', '/auth/finance/payment-transactions/'),
    ('ai_insights', '/auth/analytics/student/'),
    ('ai_insights', '/auth/analytics/batch-risk-assessment'),
    # Executive dashboard is core UX; detailed finance forecast stays gated.
    ('advanced_analytics', '/auth/finance/analytics/forecast'),
    ('realtime_notifications', '/ws/'),
]

SKIP_PREFIXES = (
    '/admin/',
    '/api/schema/',
    '/api/docs/',
    '/api/redoc/',
    '/api/v1/health/',
    '/api/health/',
    '/api/v1/features/',
    '/api/v2/features/',
    '/api/features/',
    '/api/v1/schema/',
    '/api/v2/schema/',
    '/api/v1/docs/',
    '/api/v2/docs/',
)


class FeatureFlagMiddleware:
    """Set request.features and block API paths tied to disabled features."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant = getattr(request, 'tenant', None)
        user = getattr(request, 'user', None)
        request.features = resolve_all_features(tenant=tenant, user=user)

        blocked = self._blocked_feature(request)
        if blocked:
            return JsonResponse(
                {
                    'error': 'Feature not available',
                    'feature': blocked,
                    'detail': f"The '{blocked}' feature is disabled for this tenant.",
                },
                status=404,
            )

        return self.get_response(request)

    def _blocked_feature(self, request) -> str | None:
        path = request.path
        if not path.startswith('/api/'):
            return None
        for skip in SKIP_PREFIXES:
            if path.startswith(skip):
                return None

        features = getattr(request, 'features', {})

        for feature_name, prefix in FEATURE_ROUTE_PREFIXES:
            if _path_matches_prefix(path, prefix) and not features.get(feature_name, False):
                return feature_name
        return None


def _path_matches_prefix(path: str, prefix: str) -> bool:
    for candidate in (prefix, f'/api/v1{prefix}', f'/api{prefix}'):
        if path.startswith(candidate):
            return True
    return False
