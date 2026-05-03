from rest_framework.permissions import BasePermission, AllowAny
from .rbac_models import UserRole, Permission, Module

class HasModulePermission(BasePermission):
    def has_permission(self, request, view):
        # Allow unauthenticated access for development
        if not request.user or not request.user.is_authenticated:
            return True
            
        user = request.user

        # 🔥 Define module from URL
        if "accounts" in request.path:
            module_name = "Accounts"
        elif "hr" in request.path:
            module_name = "HR"
        elif "finance" in request.path:
            module_name = "Finance"
        else:
            return True  # Allow by default for development

        user_roles = UserRole.objects.filter(user=user)

        for ur in user_roles:

            # 🔥 SuperAdmin override
            if ur.role.name == "SuperAdmin":
                return True

            perms = Permission.objects.filter(
                role=ur.role,
                module__name=module_name
            )

            for p in perms:
                if request.method == "GET" and p.can_read:
                    return True
                if request.method == "POST" and p.can_create:
                    return True
                if request.method in ["PUT", "PATCH"] and p.can_update:
                    return True
                if request.method == "DELETE" and p.can_delete:
                    return True

        return False
