from django.apps import AppConfig

class EducationAcademicsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.academics'
    label = 'education_academics'
    verbose_name = 'Academics'

    def ready(self):
        import services.education.academics.signals  # noqa: F401
