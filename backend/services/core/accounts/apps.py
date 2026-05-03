from django.apps import AppConfig

class CoreAccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.accounts'
    label = 'core_accounts'
    verbose_name = 'Users & Access'

    def ready(self):
        pass
