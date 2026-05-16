"""
ASGI entrypoint — HTTP via Django, WebSockets via Channels routing.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')

# Initialize Django before importing routing (models, settings).
django_asgi_app = get_asgi_application()

from services.core.routing import application  # noqa: E402

__all__ = ['application', 'django_asgi_app']
