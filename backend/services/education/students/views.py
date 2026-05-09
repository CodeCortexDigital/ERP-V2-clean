from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.apps import apps
from django.db import models
from .models import Student
from .serializers import StudentSerializer
import uuid

# Get other models dynamically
Attendance = apps.get_model('education_attendance', 'AttendanceRecord')


class StudentListCreateView(generics.ListCreateAPIView):
    """List all students (both active and inactive) or create a new student"""
    permission_classes = [IsAuthenticated]
    serializer_class = StudentSerializer
    
    def get_queryset(self):
        queryset = Student.objects.all()
        class_filter = self.request.query_params.get('class')
        if class_filter:
            queryset = queryset.filter(current_class__id=class_filter)
        return queryset
    
    def perform_create(self, serializer):
        if not serializer.validated_data.get('student_id'):
            serializer.save(student_id=f"STU-{uuid.uuid4().hex[:8].upper()}")
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
        return Response({'error': 'Student not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_360(request, student_id):
    """Get complete student 360 data including attendance"""
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
        
        return Response({
            'attendance': {
                'total_days': total,
                'present': present,
                'absent': absent,
                'late': late,
                'attendance_rate': attendance_rate,
            }
        })
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_student_activity(request, id):
    """Manually update student's last_activity (called from frontend)"""
    from django.utils import timezone
    from .models import Student
    try:
        student = Student.objects.get(id=id)
        student.last_activity = timezone.now()
        student.save(update_fields=['last_activity'])
        return Response({'success': True, 'last_activity': student.last_activity})
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def force_update_activity(request, student_id):
    """Force update last_activity for a student"""
    from django.utils import timezone
    from .models import Student
    try:
        student = Student.objects.get(id=student_id)
        student.last_activity = timezone.now()
        student.save(update_fields=['last_activity'])
        return Response({'success': True, 'last_activity': student.last_activity})
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)
