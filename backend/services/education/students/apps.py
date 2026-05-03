from django.apps import AppConfig

class EducationStudentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.students'
    label = 'education_students'
    verbose_name = 'Students'

    def ready(self):
        pass
