from rest_framework.exceptions import APIException
from rest_framework import status
from .constants import ERROR_MESSAGES

class ExamBaseException(APIException):
    """Base exception for exams service"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'An error occurred'
    default_code = 'error'

class DuplicateRegistrationException(ExamBaseException):
    """Raised when student already registered"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = ERROR_MESSAGES['duplicate_registration']
    default_code = 'duplicate_registration'

class ExamNotFoundException(ExamBaseException):
    """Raised when exam is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = ERROR_MESSAGES['exam_not_found']
    default_code = 'exam_not_found'

class RegistrationNotFoundException(ExamBaseException):
    """Raised when registration is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = ERROR_MESSAGES['registration_not_found']
    default_code = 'registration_not_found'

class ResultAlreadyExistsException(ExamBaseException):
    """Raised when result already exists"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = ERROR_MESSAGES['result_already_exists']
    default_code = 'result_already_exists'

class ExamAlreadyPublishedException(ExamBaseException):
    """Raised when trying to modify published exam"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = ERROR_MESSAGES['exam_already_published']
    default_code = 'exam_already_published'

class InvalidMarksException(ExamBaseException):
    """Raised when marks are invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = ERROR_MESSAGES['invalid_marks']
    default_code = 'invalid_marks'

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