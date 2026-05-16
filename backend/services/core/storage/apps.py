from django.apps import AppConfig


class CoreStorageConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.storage'
    label = 'core_storage'
    verbose_name = 'File storage'
