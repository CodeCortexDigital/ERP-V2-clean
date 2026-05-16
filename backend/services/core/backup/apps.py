from django.apps import AppConfig


class CoreBackupConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.backup'
    label = 'core_backup'
    verbose_name = 'Backup & Disaster Recovery'

    def ready(self):
        pass
