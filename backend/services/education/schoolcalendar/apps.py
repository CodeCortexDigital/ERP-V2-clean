from django.apps import AppConfig


class EducationCalendarConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.schoolcalendar'
    label = 'education_calendar'
    verbose_name = 'School calendar'
