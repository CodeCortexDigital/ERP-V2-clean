from django.apps import AppConfig


class CorePrivacyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.privacy'
    label = 'core_privacy'
    verbose_name = 'Privacy documents, consent and incidents'
