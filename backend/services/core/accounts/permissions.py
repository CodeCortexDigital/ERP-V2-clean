from rest_framework.permissions import BasePermission
from .decorators import get_user_role


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_user_role(request.user) == 'teacher'


class IsParent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_user_role(request.user) == 'parent'


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_user_role(request.user) == 'student'


class IsAccountant(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_user_role(request.user) == 'accountant'


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_user_role(request.user) == 'admin'


class DenyAccountantExamAccess(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_user_role(request.user) != 'accountant'
