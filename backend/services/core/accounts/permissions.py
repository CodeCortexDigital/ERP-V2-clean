from rest_framework import permissions


class IsSchoolAdmin(permissions.BasePermission):
    """The school's administrators (and the platform owner). Django's is_staff flag is NOT enough: it only
    opens the Django admin site, and demo seeding gave it to teachers."""
    message = 'Only school administrators can do this.'

    def has_permission(self, request, view):
        from .decorators import is_admin
        return bool(request.user and request.user.is_authenticated and is_admin(request.user))


class IsPlatformOwner(permissions.BasePermission):
    """Settings that affect every school (global feature flags)."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '') == 'admin'

class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '') == 'teacher'

class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '') == 'student'
