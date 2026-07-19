
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
import uuid
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
from .services import bulk_save_attendance_records, ensure_present_for_school_day, ensure_attendance_for_past_days

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
        import uuid
        queryset = Attendance.objects.select_related('student').all()
        date_param = self.request.query_params.get('date')
        date_from_param = self.request.query_params.get('date_from')
        date_to_param = self.request.query_params.get('date_to')
        student_id = self.request.query_params.get('student_id')

        if student_id:
            is_uuid = False
            try:
                uuid.UUID(str(student_id))
                is_uuid = True
            except (ValueError, TypeError):
                is_uuid = False

            if is_uuid:
                queryset = queryset.filter(Q(student_id=student_id) | Q(student__student_id=student_id))
            else:
                queryset = queryset.filter(student__student_id=student_id)

            if date_param:
                query_date = parse_date(date_param) or timezone.localtime().date()
                queryset = queryset.filter(date=query_date)
            elif date_from_param or date_to_param:
                date_from = parse_date_param(date_from_param)
                date_to = parse_date_param(date_to_param)
                if date_from:
                    queryset = queryset.filter(date__gte=date_from)
                if date_to:
                    queryset = queryset.filter(date__lte=date_to)
        else:
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

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.lower())

        queryset = filter_attendance_for_user(self.request.user, queryset)
        return queryset.order_by('-date')

    def _ensure_attendance_for_date(self, query_date):
        ensure_attendance_for_past_days(query_date)
    
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
def class_attendance_statistics(request, class_id):
    """Per-class attendance statistics for a given month (defaults to current month)."""
    from django.utils.dateparse import parse_date
    from datetime import timedelta
    import calendar

    today = timezone.localtime().date()
    month_param = request.query_params.get('month')
    year_param = request.query_params.get('year')

    if month_param and year_param:
        try:
            y, m = int(year_param), int(month_param)
            start = date(y, m, 1)
            last_day = calendar.monthrange(y, m)[1]
            end = date(y, m, last_day)
        except (ValueError, TypeError):
            start, end = today.replace(day=1), today
    else:
        start, end = today.replace(day=1), today

    try:
        # Students currently in this class
        student_ids = list(
            Student.objects.filter(current_class_id=class_id, is_active=True)
            .values_list('id', flat=True)
        )
        if not student_ids:
            return Response({'total': 0, 'present': 0, 'absent': 0, 'percentage': 0})

        records = Attendance.objects.filter(
            student_id__in=student_ids,
            date__gte=start,
            date__lte=end,
        ).exclude(status='holiday')

        total = records.count()
        present = records.filter(status='present').count()
        absent = records.filter(status='absent').count()
        percentage = round((present / total) * 100) if total > 0 else 0
        return Response({'total': total, 'present': present, 'absent': absent, 'percentage': percentage})
    except Exception as e:
        return Response({'total': 0, 'present': 0, 'absent': 0, 'percentage': 0, 'error': str(e)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_summary(request):
    """Get attendance summary for dashboard"""
    try:
        ensure_attendance_for_past_days(timezone.localtime().date())
        queryset = filter_attendance_for_user(request.user, Attendance.objects.all())
        school_records = queryset.exclude(status='holiday')
        total_records = school_records.count()
        present = school_records.filter(status='present').count()
        absent = school_records.filter(status='absent').count()
        late = school_records.filter(status='late').count()
        
        return Response({
            'total_records': total_records,
            'present': present,
            'absent': absent,
            'late': late,
            'attendance_rate': round(((present + late) / total_records * 100), 1) if total_records > 0 else 0
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_attendance_history(request, student_id):
    """Attendance history for a single student (date range optional)."""
    try:
        is_uuid = False
        try:
            uuid.UUID(str(student_id))
            is_uuid = True
        except (ValueError, TypeError):
            is_uuid = False

        base = Attendance.objects.select_related('student')
        if is_uuid:
            base = base.filter(Q(student_id=student_id) | Q(student__student_id=student_id))
        else:
            base = base.filter(student__student_id=student_id)

        base = filter_attendance_for_user(request.user, base)

        date_from = parse_date_param(request.query_params.get('start_date') or request.query_params.get('date_from'))
        date_to = parse_date_param(request.query_params.get('end_date') or request.query_params.get('date_to'))
        if date_from:
            base = base.filter(date__gte=date_from)
        if date_to:
            base = base.filter(date__lte=date_to)

        limit = request.query_params.get('limit')
        qs = base.exclude(status='holiday').order_by('-date')
        if limit and limit.isdigit():
            qs = qs[:int(limit)]

        serializer = AttendanceRecordSerializer(qs, many=True)
        return Response({'results': serializer.data, 'count': qs.count()})
    except Exception as e:
        return Response({'results': [], 'count': 0, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_attendance_summary(request, student_id):
    """Per-student attendance summary (counts + percentage)."""
    try:
        is_uuid = False
        try:
            uuid.UUID(str(student_id))
            is_uuid = True
        except (ValueError, TypeError):
            is_uuid = False

        base = Attendance.objects.all()
        if is_uuid:
            base = base.filter(Q(student_id=student_id) | Q(student__student_id=student_id))
        else:
            base = base.filter(student__student_id=student_id)

        base = filter_attendance_for_user(request.user, base).exclude(status='holiday')

        total = base.count()
        present = base.filter(status='present').count()
        absent = base.filter(status='absent').count()
        late = base.filter(status='late').count()
        leave = base.filter(status='leave').count()

        percent = round(((present + late + leave) / total) * 100, 1) if total > 0 else 0

        return Response({
            'total': total,
            'present': present,
            'absent': absent,
            'late': late,
            'leave': leave,
            'percent': percent,
            'attendance_rate': percent,
        })
    except Exception as e:
        return Response(
            {'total': 0, 'present': 0, 'absent': 0, 'late': 0, 'leave': 0, 'percent': 0, 'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )


