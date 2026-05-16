from django.apps import AppConfig


class CoreFeaturesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.features'
    label = 'core_features'
    verbose_name = 'Feature flags'

    def ready(self):
        from . import signals  # noqa: F401
