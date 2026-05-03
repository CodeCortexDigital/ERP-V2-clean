from django.apps import AppConfig

class CommunicationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.communication'
    label = 'education_communication'
    verbose_name = 'Communication'

    def ready(self):
        pass
