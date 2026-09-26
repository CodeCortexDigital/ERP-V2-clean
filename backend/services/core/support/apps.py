from django.apps import AppConfig


class CoreSupportConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.support'
    label = 'core_support'
    verbose_name = 'Help centre and support tickets'
