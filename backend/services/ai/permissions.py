"""DRF permissions for AI endpoints, based on the app's resolved user role."""
from rest_framework.permissions import BasePermission

from services.core.accounts.decorators import get_user_role


class _RolePermission(BasePermission):
    roles: tuple[str, ...] = ()
    message = "Your role is not allowed to use this AI feature."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return get_user_role(user) in self.roles


class IsAIAdmin(_RolePermission):
    roles = ("admin",)


class IsAIStaff(_RolePermission):
    """Admins and accountants."""
    roles = ("admin", "accountant")


class IsAIEducator(_RolePermission):
    """Admins and teachers — content generation (lesson plans, quizzes)."""
    roles = ("admin", "teacher")


class HasAIRole(_RolePermission):
    """Any recognised ERP role (excludes authenticated users with no role)."""
    roles = ("admin", "accountant", "teacher", "student", "parent")
