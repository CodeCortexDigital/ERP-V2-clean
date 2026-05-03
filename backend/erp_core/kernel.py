from django.conf import settings
from apps.core.modules.models import Module, TenantModule


def get_active_modules():
    """
    Returns list of active module app_labels
    """

    system_modules = Module.objects.filter(is_system=True).values_list(
        "app_label", flat=True
    )

    tenant_modules = TenantModule.objects.filter(
        is_enabled=True
    ).values_list("module__app_label", flat=True)

    return list(system_modules) + list(tenant_modules)


def load_dynamic_apps():
    """
    Dynamically inject active modules into INSTALLED_APPS
    """

    active_modules = get_active_modules()

    for app_label in active_modules:
        app_path = f"apps.{app_label}"

        if app_path not in settings.INSTALLED_APPS:
            settings.INSTALLED_APPS.append(app_path)

    print(f"🚀 Dynamic Kernel Loaded {len(active_modules)} modules")

