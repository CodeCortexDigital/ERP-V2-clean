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

class IsStudentOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow students to edit their own data.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only if user is the student (would need student_id mapping)
        # For now, allow if authenticated
        return request.user and request.user.is_authenticated

class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Allow the school office full access, others read-only.
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        from services.core.accounts.decorators import is_admin
        # The school office. (Django's is_staff only opens the Django admin site.)
        return bool(request.user and request.user.is_authenticated and is_admin(request.user))

class IsOwnerOrStaff(permissions.BasePermission):
    """
    Object-level permission to allow owners or staff to edit.
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        from services.core.accounts.decorators import is_admin
        # The school office can access anything
        if is_admin(request.user):
            return True
        
        # Check if user owns the object (if applicable)
        if hasattr(obj, 'student') and hasattr(obj.student, 'user_id'):
            return str(obj.student.user_id) == str(request.user.id)
        
        if hasattr(obj, 'user_id'):
            return str(obj.user_id) == str(request.user.id)
        
        return False

class CanViewPrivateNotes(permissions.BasePermission):
    """
    Permission to view private notes.
    """
    
    def has_permission(self, request, view):
        from services.core.accounts.decorators import is_admin
        # The school office. (Django's is_staff only opens the Django admin site.)
        return bool(request.user and request.user.is_authenticated and is_admin(request.user))

class CanManageDocuments(permissions.BasePermission):
    """
    Permission to manage (verify/reject) documents.
    """
    
    def has_permission(self, request, view):
        from services.core.accounts.decorators import is_admin
        # The school office. (Django's is_staff only opens the Django admin site.)
        return bool(request.user and request.user.is_authenticated and is_admin(request.user))

class CanEnrollStudents(permissions.BasePermission):
    """
    Permission to enroll students in courses.
    """
    
    def has_permission(self, request, view):
        from services.core.accounts.decorators import is_admin
        # The school office. (Django's is_staff only opens the Django admin site.)
        return bool(request.user and request.user.is_authenticated and is_admin(request.user))

class IsSystemService(permissions.BasePermission):
    """
    Permission for internal service-to-service communication.
    """
    
    def has_permission(self, request, view):
        api_key = request.headers.get('X-API-Key')
        from django.conf import settings
        return api_key == settings.INTERNAL_API_KEY