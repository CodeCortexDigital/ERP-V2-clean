from django.apps import AppConfig


class EducationImportsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.imports'
    label = 'education_imports'
    verbose_name = 'Data import'
