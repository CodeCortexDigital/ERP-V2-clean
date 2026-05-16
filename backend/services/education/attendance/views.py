
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
from .calendar import default_status_for_date, is_school_day, parse_attendance_date
from .services import bulk_save_attendance_records, ensure_present_for_school_day

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
        ensure_present_for_school_day(query_date)
    
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
    """Save multiple attendance records at once (present by default on school days)."""
    records = request.data.get('records', [])
    result = bulk_save_attendance_records(request.user, records)
    if result.get('forbidden'):
        return Response({'error': result['error']}, status=status.HTTP_403_FORBIDDEN)
    return Response(
        {
            'message': result['message'],
            'created': result['created'],
            'updated': result['updated'],
            'errors': result['errors'],
        },
        status=status.HTTP_200_OK,
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


