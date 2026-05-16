
def update_student_last_activity(student_id):
    """Helper to update student last_activity"""
    from services.education.students.models import Student
    from django.utils import timezone
    try:
        student = Student.objects.get(id=student_id)
        student.last_activity = timezone.now()
        student.save(update_fields=['last_activity'])
        return True
    except:
        return False
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.apps import apps
from django.db.models import Count, Q, Prefetch
from datetime import datetime, date
from django.utils import timezone
from django.utils.dateparse import parse_date
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer
from services.core.accounts.decorators import (
    filter_attendance_for_user,
    get_user_role,
    ensure_student_access,
)
from services.core.utils.filters import parse_date_param

Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
Student = apps.get_model('education_students', 'Student')


class AttendanceListCreateView(generics.ListCreateAPIView):
    """List attendance records or create new ones"""
    permission_classes = [IsAuthenticated]
    serializer_class = AttendanceRecordSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        queryset = Attendance.objects.select_related('student').all()
        date_param = self.request.query_params.get('date')
        date_from_param = self.request.query_params.get('date_from')
        date_to_param = self.request.query_params.get('date_to')

        if date_from_param or date_to_param:
            date_from = parse_date_param(date_from_param)
            date_to = parse_date_param(date_to_param)
            if date_from:
                queryset = queryset.filter(date__gte=date_from)
            if date_to:
                queryset = queryset.filter(date__lte=date_to)
        else:
            if date_param:
                query_date = parse_date(date_param) or timezone.localtime().date()
            else:
                query_date = timezone.localtime().date()

            self._ensure_attendance_for_date(query_date)
            queryset = queryset.filter(date=query_date)

        student_id = self.request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.lower())

        queryset = filter_attendance_for_user(self.request.user, queryset)
        return queryset.order_by('-date')

    def _ensure_attendance_for_date(self, query_date):
        existing_student_ids = set(
            Attendance.objects.filter(date=query_date).values_list('student_id', flat=True)
        )
        missing_students = Student.objects.filter(is_active=True).exclude(id__in=existing_student_ids)
        records_to_create = []
        for student in missing_students:
            records_to_create.append(
                Attendance(
                    student=student,
                    date=query_date,
                    status='present',
                    course_id=str(student.current_class_id) if getattr(student, 'current_class_id', None) else '',
                    remarks='Auto-marked present for school day'
                )
            )
        if records_to_create:
            Attendance.objects.bulk_create(records_to_create)
    
    def perform_create(self, serializer):
        serializer.save()


class AttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete an attendance record"""
    permission_classes = [IsAuthenticated]
    serializer_class = AttendanceRecordSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return filter_attendance_for_user(self.request.user, Attendance.objects.select_related('student').all())


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_attendance(request):
    """Save multiple attendance records at once"""
    role = get_user_role(request.user)
    if role not in ['admin', 'teacher']:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    teacher_class_ids = []
    if role == 'teacher' and hasattr(request.user, 'teacher_profile'):
        teacher_class_ids = list(request.user.teacher_profile.assigned_classes.values_list('id', flat=True))

    try:
        records = request.data.get('records', [])
        created_count = 0
        updated_count = 0
        errors = []
        
        for record in records:
            student_id = record.get('student_id')
            status_val = record.get('status')
            date_str = record.get('date')
            class_id = record.get('class_id', '')
            
            # Parse date
            try:
                record_date = datetime.strptime(date_str, '%Y-%m-%d').date() if isinstance(date_str, str) else date.today()
            except:
                record_date = date.today()
            
            # Get the student object
            try:
                student = Student.objects.get(id=student_id)
            except Student.DoesNotExist:
                errors.append(f'Student not found: {student_id}')
                continue

            if role == 'teacher' and student.current_class_id not in teacher_class_ids:
                errors.append(f'Permission denied for student: {student_id}')
                continue
            
            # Update or create attendance record
            attendance, created = Attendance.objects.update_or_create(
                student=student,
                date=record_date,
                defaults={
                    'status': status_val,
                    'course_id': class_id,
                    'remarks': ''
                }
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        return Response({
            'message': f'Attendance saved: {created_count} created, {updated_count} updated',
            'created': created_count,
            'updated': updated_count,
            'errors': errors
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_summary(request):
    """Get attendance summary for dashboard"""
    try:
        queryset = filter_attendance_for_user(request.user, Attendance.objects.all())
        total_records = queryset.count()
        present = queryset.filter(status='present').count()
        absent = queryset.filter(status='absent').count()
        late = queryset.filter(status='late').count()
        
        return Response({
            'total_records': total_records,
            'present': present,
            'absent': absent,
            'late': late,
            'attendance_rate': round((present / total_records * 100), 1) if total_records > 0 else 0
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


