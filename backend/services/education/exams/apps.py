from django.apps import AppConfig

class EducationExamsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.exams'
    label = 'education_exams'
    verbose_name = 'Exams'

    def ready(self):
        import services.education.exams.signals  # noqa: F401
