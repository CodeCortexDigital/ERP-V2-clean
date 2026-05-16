from django.apps import AppConfig

class EducationAttendanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.attendance'
    label = 'education_attendance'
    verbose_name = 'Attendance'

    def ready(self):
        import services.education.attendance.signals  # noqa: F401
