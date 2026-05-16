from django.apps import AppConfig


class AuditConfig(AppConfig):
    name = 'services.core.audit'
    verbose_name = 'Audit Logs'

    def ready(self):
        # Import signal handlers
        try:
            from . import signals  # noqa: F401
        except Exception:
            pass
