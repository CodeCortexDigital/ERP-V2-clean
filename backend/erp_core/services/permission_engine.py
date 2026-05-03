from django.contrib.auth.models import Permission
from django.contrib.auth import get_user_model


User = get_user_model()


def sync_permissions():
    """
    Sync all permissions and assign them to Super Admin automatically.
    """

    print("🔄 Syncing permissions...")

    # Get all permissions
    all_permissions = Permission.objects.all()

    # Find super admin users
    super_admins = User.objects.filter(is_superuser=True)

    if not super_admins.exists():
        print("⚠️ No Super Admin found.")
        return

    for admin in super_admins:
        admin.user_permissions.set(all_permissions)
        admin.save()

    print(f"✅ {all_permissions.count()} permissions assigned to Super Admin.")

