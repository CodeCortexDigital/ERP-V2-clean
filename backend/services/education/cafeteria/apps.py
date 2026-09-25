from django.apps import AppConfig


class EducationCafeteriaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.cafeteria'
    label = 'education_cafeteria'
    verbose_name = 'Cafeteria'

    def ready(self):
        from . import signals  # noqa: F401  (credit top-ups when their invoice is paid)
