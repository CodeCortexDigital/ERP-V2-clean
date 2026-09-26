from django.apps import AppConfig


class CoreSecurityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.security'
    label = 'core_security'
    verbose_name = 'Privacy & security'
