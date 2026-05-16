"""Task package for services.core.
Importing task modules here ensures Celery autodiscovery picks them up.
"""
from . import notification_tasks  # noqa: F401
from . import analytics_tasks  # noqa: F401
