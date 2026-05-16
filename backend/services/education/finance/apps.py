from django.apps import AppConfig

class FinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.finance'
    label = 'education_finance'
    verbose_name = 'Finance'

    def ready(self):
        import services.education.finance.signals  # noqa: F401
