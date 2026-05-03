from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow admins to edit.
    Read-only allowed for everyone.
    """
    
    def has_permission(self, request, view):
        # Allow read-only for everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for authenticated users
        return request.user and request.user.is_authenticated

class IsProgramAdmin(permissions.BasePermission):
    """
    Permission for program administrators
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # For now, allow all authenticated users
        # In production, check for admin role
        return True

class IsFacultyMember(permissions.BasePermission):
    """
    Permission for faculty members
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # For now, allow all authenticated users
        return True

class CanManageCurriculum(permissions.BasePermission):
    """
    Permission to manage curriculum
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # For now, allow all authenticated users
        return True