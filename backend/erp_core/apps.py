from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "erp_core"

    def ready(self):
        # Only import signals
        import erp_core.signals
