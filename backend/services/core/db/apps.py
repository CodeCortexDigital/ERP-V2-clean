from django.apps import AppConfig


class CoreDbConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.db'
    label = 'core_db'
    verbose_name = 'Database scalability'

    def ready(self):
        from .monitoring import install_execute_wrapper

        install_execute_wrapper()
