from django.apps import AppConfig


class CoreTenantsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.core.tenants'
    label = 'core_tenants'
    verbose_name = 'Multi-tenant schools'

    def ready(self):
        # Filter every school-owned model to the current school (see scoping.py).
        from .scoping import install

        install()
