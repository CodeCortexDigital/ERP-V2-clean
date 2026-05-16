"""
URL-path API versioning, deprecation headers, and version-aware serializers.
"""

from __future__ import annotations

import importlib
import re
from datetime import date
from typing import Any

from django.utils import timezone

API_VERSION_HEADER = 'API-Version'
DEFAULT_VERSION = 'v1'
SUPPORTED_VERSIONS = frozenset({'v1', 'v2'})

# v1 announced for deprecation; sunset 6 months after announcement (policy).
V1_DEPRECATION_ANNOUNCED = date(2026, 5, 16)
V1_SUNSET = date(2026, 11, 16)

VERSION_POLICY: dict[str, dict[str, Any]] = {
    'v1': {
        'status': 'deprecated',
        'announced': V1_DEPRECATION_ANNOUNCED,
        'sunset': V1_SUNSET,
        'successor': 'v2',
        'description': 'Stable legacy contract; no fields removed.',
    },
    'v2': {
        'status': 'current',
        'announced': date(2026, 5, 16),
        'sunset': None,
        'successor': None,
        'description': 'Current API; additive fields only.',
    },
}

SERIALIZER_REGISTRY: dict[str, dict[str, str]] = {
    'students': {
        'v1': 'api.v1.serializers.StudentSerializerV1',
        'v2': 'api.v2.serializers.StudentSerializerV2',
    },
}

_VERSION_RE = re.compile(r'^/api/(v\d+)(/|$)')


def parse_api_version(path: str) -> str | None:
    match = _VERSION_RE.match(path)
    if not match:
        return None
    version = match.group(1)
    return version if version in SUPPORTED_VERSIONS else None


def resolve_request_version(request) -> str:
    """Version for this request: path segment, header override, or default v1."""
    path_version = parse_api_version(request.path)
    if path_version:
        return path_version
    header = request.META.get('HTTP_API_VERSION', '').strip().lower()
    if header in SUPPORTED_VERSIONS:
        return header
    # Unversioned /api/... legacy routes behave as v1
    return DEFAULT_VERSION


def get_serializer_class(resource: str, version: str | None = None):
    """Import and return the DRF serializer class for a resource + version."""
    version = version or DEFAULT_VERSION
    paths = SERIALIZER_REGISTRY.get(resource, {})
    dotted = paths.get(version) or paths.get(DEFAULT_VERSION)
    if not dotted:
        raise LookupError(f'No serializer registered for {resource!r} @ {version!r}')
    module_path, class_name = dotted.rsplit('.', 1)
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


def v1_deprecation_active() -> bool:
    return timezone.now().date() >= V1_DEPRECATION_ANNOUNCED


def apply_deprecation_headers(response, version: str):
    if version != 'v1' or not v1_deprecation_active():
        return response
    policy = VERSION_POLICY['v1']
    response['Deprecation'] = 'true'
    if policy.get('sunset'):
        response['Sunset'] = policy['sunset'].isoformat()
    successor = policy.get('successor')
    if successor:
        response['Link'] = f'</api/{successor}/>; rel="successor-version"'
    response[API_VERSION_HEADER] = 'v1'
    return response


class APIVersionMiddleware:
    """Set request.version and emit RFC-style deprecation headers for v1."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.version = resolve_request_version(request)
        response = self.get_response(request)
        if request.path.startswith('/api/'):
            response[API_VERSION_HEADER] = request.version
            apply_deprecation_headers(response, request.version)
        return response


class VersionedViewMixin:
    """
    Pick serializer from serializer_classes_by_version using request.version.
    """

    serializer_classes_by_version: dict[str, type] = {}

    def get_serializer_class(self):
        version = getattr(self.request, 'version', DEFAULT_VERSION) or DEFAULT_VERSION
        if version in self.serializer_classes_by_version:
            return self.serializer_classes_by_version[version]
        if DEFAULT_VERSION in self.serializer_classes_by_version:
            return self.serializer_classes_by_version[DEFAULT_VERSION]
        return super().get_serializer_class()
