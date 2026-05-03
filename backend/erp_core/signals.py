from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.db.utils import OperationalError

from apps.core.modules.models import TenantModule
from erp_core.services.permission_engine import sync_permissions
from erp_core.services.role_engine import setup_roles
from erp_core.services.module_auto_register import auto_register_modules


@receiver(post_migrate)
def initialize_erp(sender, **kwargs):
    try:
        print("🚀 Running ERP post_migrate initialization...")

        # STEP 1 — Auto register modules
        auto_register_modules()

        # STEP 2 — Load enabled modules
        enabled_modules = TenantModule.objects.filter(is_enabled=True)
        print(f"🚀 Dynamic Kernel Loaded {enabled_modules.count()} modules")

        # STEP 3 — Sync permissions
        sync_permissions()
        print("🔐 Permissions synced successfully")

        # STEP 4 — Setup roles
        setup_roles()
        print("👥 Roles setup successfully")

    except OperationalError:
        # Database not ready
        pass

    except Exception as e:
        print("⚠️ ERP initialization skipped:", e)
