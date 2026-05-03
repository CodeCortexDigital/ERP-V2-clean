import django_filters
from django_filters import rest_framework as filters
from .models import AttendanceSession, AttendanceRecord, AttendanceSummary

class AttendanceSessionFilter(filters.FilterSet):
    """Filter set for AttendanceSession"""
    
    date_from = filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='lte')
    
    time_from = filters.TimeFilter(field_name='start_time', lookup_expr='gte')
    time_to = filters.TimeFilter(field_name='end_time', lookup_expr='lte')
    
    course = filters.UUIDFilter(field_name='course_id')
    session_type = filters.ChoiceFilter(choices=AttendanceSession.SESSION_TYPES)
    
    min_attendance = filters.NumberFilter(method='filter_min_attendance')
    
    class Meta:
        model = AttendanceSession
        fields = ['course_id', 'session_type', 'date', 'is_cancelled']
    
    def filter_min_attendance(self, queryset, name, value):
        """Filter sessions with attendance percentage above minimum"""
        return queryset.filter(present_count__gte=value)

class AttendanceRecordFilter(filters.FilterSet):
    """Filter set for AttendanceRecord"""
    
    date_from = filters.DateFilter(field_name='session__date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='session__date', lookup_expr='lte')
    
    student = filters.UUIDFilter(field_name='student_id')
    session = filters.UUIDFilter(field_name='session__id')
    course = filters.UUIDFilter(field_name='session__course_id')
    
    status = filters.MultipleChoiceFilter(choices=AttendanceRecord.ATTENDANCE_STATUS)
    
    class Meta:
        model = AttendanceRecord
        fields = ['student_id', 'session', 'status']

class AttendanceSummaryFilter(filters.FilterSet):
    """Filter set for AttendanceSummary"""
    
    date_from = filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='lte')
    
    student = filters.UUIDFilter(field_name='student_id')
    
    min_percentage = filters.NumberFilter(field_name='attendance_percentage', lookup_expr='gte')
    max_percentage = filters.NumberFilter(field_name='attendance_percentage', lookup_expr='lte')
    
    class Meta:
        model = AttendanceSummary
        fields = ['student_id', 'date']