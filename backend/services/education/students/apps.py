from django.apps import AppConfig

class EducationStudentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.students'
    label = 'education_students'
    verbose_name = 'Students'

    def ready(self):
        from services.core.signals.cache_invalidation import connect_cache_invalidation_signals
        connect_cache_invalidation_signals()
