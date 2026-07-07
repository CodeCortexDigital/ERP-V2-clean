from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "erp_core"

    def ready(self):
        import erp_core.signals                  # existing post_migrate initializer
        import erp_core.dashboard_signals        # real-time dashboard WS broadcast signals
