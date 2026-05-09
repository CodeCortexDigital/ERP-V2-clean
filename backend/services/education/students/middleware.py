from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone

class StudentActivityMiddleware(MiddlewareMixin):
    """Automatically update last_activity when student-related APIs are called"""
    
    def process_response(self, request, response):
        # Update last_activity when student profile is updated
        if request.method in ['POST', 'PUT', 'PATCH'] and '/api/education/students/' in request.path:
            try:
                import json
                from .models import Student
                
                # Extract student ID from URL
                path_parts = request.path.split('/')
                for i, part in enumerate(path_parts):
                    if part == 'students' and i+1 < len(path_parts):
                        student_id = path_parts[i+1]
                        if student_id and student_id != '':
                            student = Student.objects.get(id=student_id)
                            student.last_activity = timezone.now()
                            student.save(update_fields=['last_activity'])
                            break
            except Exception:
                pass
        return response
