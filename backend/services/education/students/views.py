from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.apps import apps
from django.db import models
from .models import Student
from .serializers import StudentSerializer
import uuid

Student = apps.get_model('education_students', 'Student')


class StudentListCreateView(generics.ListCreateAPIView):
    """List all students or create a new student"""
    permission_classes = [IsAuthenticated]
    serializer_class = StudentSerializer
    
    def get_queryset(self):
        queryset = Student.objects.filter(is_active=True)
        
        # Add filters if needed
        class_filter = self.request.query_params.get('class')
        if class_filter:
            queryset = queryset.filter(current_class__id=class_filter)
        
        return queryset
    
    def perform_create(self, serializer):
        # Auto-generate student_id if not provided
        if not serializer.validated_data.get('student_id'):
            serializer.save(student_id=f"STU-2026-{str(uuid.uuid4().hex[:4]).upper()}")
        else:
            serializer.save()


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a student"""
    permission_classes = [IsAuthenticated]
    serializer_class = StudentSerializer
    lookup_field = 'id'
    
    def get_queryset(self):
        return Student.objects.all()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_by_id(request, student_id):
    """Get student by their student_id field"""
    try:
        student = Student.objects.get(student_id=student_id)
        serializer = StudentSerializer(student)
        return Response(serializer.data)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_360(request, student_id):
    """Get complete student 360 data"""
    try:
        student = Student.objects.get(id=student_id)
        
        # Get attendance data
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        attendance_records = Attendance.objects.filter(student=student)
        total = attendance_records.count()
        present = attendance_records.filter(status='present').count()
        absent = attendance_records.filter(status='absent').count()
        late = attendance_records.filter(status='late').count()
        attendance_rate = round((present / total * 100), 1) if total > 0 else 0
        
        # Get exam results
        ExamResult = apps.get_model('education_exams', 'ExamResult')
        exam_results = ExamResult.objects.filter(student=student)
        total_exams = exam_results.count()
        passed = exam_results.filter(is_pass=True).count()
        failed = total_exams - passed
        avg_percentage = exam_results.aggregate(models.Avg('percentage'))['percentage__avg'] or 0
        
        # Get finance data
        Invoice = apps.get_model('education_finance', 'Invoice')
        invoices = Invoice.objects.filter(student=student)
        total_amount = sum(float(i.amount) for i in invoices)
        total_paid = sum(float(i.paid_amount) for i in invoices)
        balance_due = total_amount - total_paid
        
        return Response({
            'student': {
                'id': str(student.id),
                'student_id': student.student_id,
                'full_name': student.full_name,
                'email': student.email,
                'phone': student.phone,
                'father_name': getattr(student, 'father_name', ''),
                'mother_name': getattr(student, 'mother_name', ''),
                'guardian_phone': getattr(student, 'guardian_phone', ''),
                'program': getattr(student, 'program', ''),
                'enrollment_date': getattr(student, 'enrollment_date', None),
                'is_active': student.is_active,
                'current_class': getattr(student.current_class, 'name', None) if hasattr(student, 'current_class') else None,
                'current_section': getattr(student.current_section, 'name', None) if hasattr(student, 'current_section') else None,
            },
            'attendance': {
                'total_days': total,
                'present': present,
                'absent': absent,
                'late': late,
                'attendance_rate': attendance_rate,
            },
            'exams': {
                'total_exams': total_exams,
                'passed': passed,
                'failed': failed,
                'average_percentage': round(avg_percentage, 1),
                'results': [
                    {
                        'exam_title': r.exam.title,
                        'marks': f"{r.obtained_marks}/{r.total_marks}",
                        'percentage': r.percentage,
                        'grade': r.grade,
                        'status': 'Pass' if r.is_pass else 'Fail'
                    } for r in exam_results
                ]
            },
            'finance': {
                'total_invoices': invoices.count(),
                'total_amount': total_amount,
                'total_paid': total_paid,
                'balance_due': balance_due,
                'payment_percentage': round((total_paid / total_amount * 100), 1) if total_amount > 0 else 0
            }
        })
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
