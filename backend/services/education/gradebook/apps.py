from django.apps import AppConfig


class EducationGradebookConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.gradebook'
    label = 'education_gradebook'
    verbose_name = 'Gradebook'

    def ready(self):
        from . import signals  # noqa: F401
