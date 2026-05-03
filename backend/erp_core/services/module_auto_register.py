from django.conf import settings
from apps.core.modules.models import Module, TenantModule
from apps.core.tenants.models import Company


def auto_register_modules():
    """
    Automatically register new Django apps as ERP modules.
    """

    print("🔍 Scanning for new apps...")

    installed_apps = settings.INSTALLED_APPS

    # Only ERP apps inside "apps." folder
    erp_apps = [
        app for app in installed_apps
        if app.startswith("apps.")
    ]

    new_modules_count = 0

    for app_path in erp_apps:

        parts = app_path.split(".")
        if len(parts) < 2:
            continue

        app_label = parts[1]   # ⭐ KEY FIX

        module, created = Module.objects.get_or_create(
            app_label=app_label,
            defaults={
                "name": app_label.replace("_", " ").title(),
                "is_active": True,
                "is_system": False,
            }
        )

        if created:
            new_modules_count += 1
            print(f"✅ New module registered: {module.name}")

            # Auto assign to all companies
            companies = Company.objects.all()

            for company in companies:
                TenantModule.objects.create(
                    company=company,
                    module=module,
                    is_enabled=True,
                )

    print(f"🚀 {new_modules_count} new modules auto-registered.")

