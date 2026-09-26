from django.apps import AppConfig


class CoreBillingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.billing'
    label = 'core_billing'
    verbose_name = 'Plans & subscriptions'

    def ready(self):
        from . import signals  # noqa: F401
