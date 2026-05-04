from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.apps import apps
from django.db.models import Avg, Sum
from decimal import Decimal

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_endpoint(request):
    """Test endpoint to verify students app is working"""
    return JsonResponse({"status": "ok", "message": "Students app is working"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_360(request, student_id):
    """Complete student overview - Attendance, Exams, Fees, Communications"""
    try:
        print(f"Fetching student with ID: {student_id}")
        
        Student = apps.get_model('education_students', 'Student')
        
        # Try to get student by ID (UUID) or student_id string
        student = None
        try:
            import uuid
            student_uuid = uuid.UUID(student_id)
            student = Student.objects.get(id=student_uuid)
        except (ValueError, Student.DoesNotExist):
            # Try by student_id field
            student = Student.objects.get(student_id=student_id)
        
        print(f"Found student: {student.full_name}")
        
        # Build basic response
        response_data = {
            'student': {
                'id': str(student.id),
                'student_id': student.student_id,
                'full_name': student.full_name,
                'email': student.email,
                'phone': student.phone or '',
                'father_name': getattr(student, 'father_name', ''),
                'mother_name': getattr(student, 'mother_name', ''),
                'guardian_phone': getattr(student, 'guardian_phone', ''),
                'program': getattr(student, 'program', ''),
                'is_active': student.is_active
            },
            'attendance': {
                'total_days': 0,
                'present': 0,
                'absent': 0,
                'attendance_rate': 0,
                'recent_records': []
            },
            'exams': {
                'total_exams': 0,
                'passed': 0,
                'failed': 0,
                'average_percentage': 0,
                'recent_results': []
            },
            'finance': {
                'total_fees': 0,
                'paid': 0,
                'balance': 0,
                'payment_percentage': 0,
                'last_payment': None
            },
            'class_info': {
                'class_name': student.current_class.name if hasattr(student, 'current_class') and student.current_class else None,
                'section_name': student.current_section.name if hasattr(student, 'current_section') and student.current_section else None,
                'academic_year': None
            }
        }
        
        return Response(response_data, status=200)
        
    except Exception as e:
        print(f"Error in student_360: {str(e)}")
        return Response({'error': str(e)}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_dashboard(request, student_id):
    """Student dashboard view"""
    return student_360(request, student_id)
