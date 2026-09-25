from django.apps import AppConfig


class EducationInventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.education.inventory'
    label = 'education_inventory'
    verbose_name = 'Inventory'
