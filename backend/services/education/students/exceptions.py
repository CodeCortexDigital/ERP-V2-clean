from rest_framework.exceptions import APIException
from rest_framework import status
from django.utils.translation import gettext_lazy as _
from .constants import ERROR_MESSAGES

class StudentBaseException(APIException):
    """Base exception for students service"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'An error occurred'
    default_code = 'error'

class DuplicateStudentException(StudentBaseException):
    """Raised when trying to create duplicate student"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = ERROR_MESSAGES['duplicate_student']
    default_code = 'duplicate_student'

class StudentNotFoundException(StudentBaseException):
    """Raised when student is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = ERROR_MESSAGES['student_not_found']
    default_code = 'student_not_found'

class InvalidStatusException(StudentBaseException):
    """Raised when invalid status is provided"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = ERROR_MESSAGES['invalid_status']
    default_code = 'invalid_status'

class DocumentNotFoundException(StudentBaseException):
    """Raised when document is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = ERROR_MESSAGES['document_not_found']
    default_code = 'document_not_found'

class DuplicateEnrollmentException(StudentBaseException):
    """Raised when student is already enrolled"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = ERROR_MESSAGES['enrollment_exists']
    default_code = 'duplicate_enrollment'

class ProgramNotFoundException(StudentBaseException):
    """Raised when program is not found in academics service"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = ERROR_MESSAGES['program_not_found']
    default_code = 'program_not_found'

class FileTooLargeException(StudentBaseException):
    """Raised when file exceeds size limit"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = ERROR_MESSAGES['file_too_large']
    default_code = 'file_too_large'

class InvalidFileTypeException(StudentBaseException):
    """Raised when file type is not allowed"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = ERROR_MESSAGES['invalid_file_type']
    default_code = 'invalid_file_type'

class ServiceUnavailableException(StudentBaseException):
    """Raised when dependent service is unavailable"""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Service temporarily unavailable'
    default_code = 'service_unavailable'

class ValidationException(StudentBaseException):
    """Raised for validation errors"""
    status_code = status.HTTP_400_BAD_REQUEST
    
    def __init__(self, detail, code='validation_error'):
        self.detail = detail
        self.code = code

class PermissionDeniedException(StudentBaseException):
    """Raised when user lacks permission"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action'
    default_code = 'permission_denied'

def custom_exception_handler(exc, context):
    """Custom exception handler for consistent error responses"""
    from rest_framework.views import exception_handler
    
    response = exception_handler(exc, context)
    
    if response is not None:
        response.data = {
            'error': True,
            'status_code': response.status_code,
            'message': response.data.get('detail', str(exc)),
            'details': response.data,
        }
    
    return response