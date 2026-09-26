from django.apps import AppConfig


class CoreErrorsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.errors'
    label = 'core_errors'
    verbose_name = 'Error tracking'

    def ready(self):
        from django.core.signals import got_request_exception

        from .capture import on_request_exception

        got_request_exception.connect(on_request_exception, dispatch_uid='core_errors_capture')
