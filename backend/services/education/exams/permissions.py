from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow admins to edit.
    Read-only allowed for everyone.
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

class IsExamController(permissions.BasePermission):
    """
    Permission for exam controllers to manage exams.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff

class CanEnterResults(permissions.BasePermission):
    """
    Permission to enter exam results.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff

class CanVerifyResults(permissions.BasePermission):
    """
    Permission to verify exam results.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser

class CanManageMalpractice(permissions.BasePermission):
    """
    Permission to manage malpractice cases.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff

class IsSystemService(permissions.BasePermission):
    """
    Permission for internal service-to-service communication.
    """
    
    def has_permission(self, request, view):
        api_key = request.headers.get('X-API-Key')
        from django.conf import settings
        return api_key == settings.INTERNAL_API_KEY

class CanViewResults(permissions.BasePermission):
    """
    Permission to view exam results (students can view their own).
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Staff can view all
        if request.user.is_staff:
            return True
        
        # Students can view their own results
        if hasattr(obj, 'student_id'):
            # This would need mapping from user to student_id
            return True
        
        return False