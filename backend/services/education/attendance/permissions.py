from rest_framework import permissions

class IsTeacherOrReadOnly(permissions.BasePermission):
    """
    Allow teachers to edit, others read-only
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return request.user and request.user.is_authenticated

class CanMarkAttendance(permissions.BasePermission):
    """
    Permission to mark attendance
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

class CanViewReports(permissions.BasePermission):
    """
    Permission to view attendance reports
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

class IsSystemService(permissions.BasePermission):
    """
    Permission for internal service-to-service communication
    """
    
    def has_permission(self, request, view):
        api_key = request.headers.get('X-API-Key')
        from django.conf import settings
        return api_key == settings.INTERNAL_API_KEY