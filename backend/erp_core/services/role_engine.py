from django.contrib.auth.models import Permission
from apps.core.accounts.models import Role
from apps.core.tenants.models import Company


DEFAULT_ROLES = [
    "Super Admin",
    "Admin",
    "Manager",
    "Staff",
]


def setup_roles():
    print("👥 Setting up roles...")

    for company in Company.objects.all():
        for role_name in DEFAULT_ROLES:

            role, created = Role.objects.get_or_create(
                name=f"{company.name} - {role_name}",
                defaults={"is_system": True}
            )

            if role_name == "Super Admin":
                role.permissions.set(Permission.objects.all())

            elif role_name == "Admin":
                role.permissions.set(
                    Permission.objects.exclude(
                        codename__startswith="delete"
                    )
                )

            elif role_name == "Manager":
                role.permissions.set(
                    Permission.objects.filter(
                        codename__startswith=("view", "change")
                    )
                )

            elif role_name == "Staff":
                role.permissions.set(
                    Permission.objects.filter(
                        codename__startswith="view"
                    )
                )

    print("✅ Roles created successfully")

