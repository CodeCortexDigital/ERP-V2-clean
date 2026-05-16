from django.apps import AppConfig

class UserNotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.user_notifications'

    def ready(self):
        from . import signals  # noqa: F401
