from django.apps import AppConfig


class CorePortabilityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.portability'
    label = 'core_portability'
    verbose_name = 'Data export & deletion'
