from django.apps import AppConfig

class AdmissionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.admissions'
    label = 'education_admissions'
    verbose_name = 'Admissions'

    def ready(self):
        pass
