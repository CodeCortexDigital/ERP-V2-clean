import django_filters
from django_filters import rest_framework as filters
from .models import Exam, ExamRegistration, ExamResult, ExamMalpractice

class ExamFilter(filters.FilterSet):
    """Advanced filter set for Exam model"""
    
    title = filters.CharFilter(lookup_expr='icontains')
    code = filters.CharFilter(lookup_expr='icontains')
    
    # Date ranges
    date_from = filters.DateFilter(field_name='exam_date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='exam_date', lookup_expr='lte')
    
    # Time filters
    time_from = filters.TimeFilter(field_name='start_time', lookup_expr='gte')
    time_to = filters.TimeFilter(field_name='start_time', lookup_expr='lte')
    
    # Course filters
    course_id = filters.UUIDFilter()
    course_code = filters.CharFilter(lookup_expr='icontains')
    
    # Status and type
    status = filters.MultipleChoiceFilter(choices=Exam.STATUS_CHOICES)
    exam_format = filters.ChoiceFilter(choices=Exam.EXAM_FORMAT_CHOICES)
    exam_type = filters.UUIDFilter(field_name='exam_type__id')
    
    # Numeric ranges
    min_marks = filters.NumberFilter(field_name='total_marks', lookup_expr='gte')
    max_marks = filters.NumberFilter(field_name='total_marks', lookup_expr='lte')
    
    # Boolean
    is_published = filters.BooleanFilter()
    has_question_paper = filters.BooleanFilter(method='filter_has_question_paper')
    
    class Meta:
        model = Exam
        fields = ['code', 'title', 'course_id', 'course_code', 'status', 'exam_format']
    
    def filter_has_question_paper(self, queryset, name, value):
        if value:
            return queryset.exclude(question_paper='')
        return queryset.filter(question_paper='')

class ExamRegistrationFilter(filters.FilterSet):
    """Filter set for ExamRegistration model"""
    
    exam = filters.UUIDFilter(field_name='exam__id')
    exam_code = filters.CharFilter(field_name='exam__code', lookup_expr='icontains')
    
    student_id = filters.UUIDFilter()
    student_name = filters.CharFilter(lookup_expr='icontains')
    
    status = filters.MultipleChoiceFilter(choices=ExamRegistration.STATUS_CHOICES)
    
    room = filters.CharFilter(lookup_expr='icontains')
    has_seat = filters.BooleanFilter(method='filter_has_seat')
    
    registered_after = filters.DateTimeFilter(field_name='registration_date', lookup_expr='gte')
    registered_before = filters.DateTimeFilter(field_name='registration_date', lookup_expr='lte')
    
    class Meta:
        model = ExamRegistration
        fields = ['exam', 'student_id', 'status', 'room']
    
    def filter_has_seat(self, queryset, name, value):
        if value:
            return queryset.exclude(seat_number='')
        return queryset.filter(seat_number='')

class ExamResultFilter(filters.FilterSet):
    """Filter set for ExamResult model"""
    
    exam = filters.UUIDFilter(field_name='exam__id')
    exam_code = filters.CharFilter(field_name='exam__code', lookup_expr='icontains')
    
    student_id = filters.UUIDFilter()
    
    is_pass = filters.BooleanFilter()
    is_absent = filters.BooleanFilter()
    
    grade = filters.MultipleChoiceFilter(choices=ExamResult.GRADE_CHOICES)
    
    min_marks = filters.NumberFilter(field_name='marks_obtained', lookup_expr='gte')
    max_marks = filters.NumberFilter(field_name='marks_obtained', lookup_expr='lte')
    min_percentage = filters.NumberFilter(field_name='percentage', lookup_expr='gte')
    max_percentage = filters.NumberFilter(field_name='percentage', lookup_expr='lte')
    
    graded_by = filters.UUIDFilter()
    verified_by = filters.UUIDFilter()
    
    published = filters.BooleanFilter(method='filter_published')
    
    class Meta:
        model = ExamResult
        fields = ['exam', 'student_id', 'is_pass', 'is_absent', 'grade']
    
    def filter_published(self, queryset, name, value):
        if value:
            return queryset.exclude(published_at__isnull=True)
        return queryset.filter(published_at__isnull=True)

class ExamMalpracticeFilter(filters.FilterSet):
    """Filter set for ExamMalpractice model"""
    
    exam = filters.UUIDFilter(field_name='exam__id')
    exam_code = filters.CharFilter(field_name='exam__code', lookup_expr='icontains')
    
    student_id = filters.UUIDFilter()
    
    severity = filters.MultipleChoiceFilter(choices=ExamMalpractice.SEVERITY_CHOICES)
    status = filters.MultipleChoiceFilter(choices=ExamMalpractice.STATUS_CHOICES)
    
    reported_by = filters.UUIDFilter()
    reported_after = filters.DateTimeFilter(field_name='reported_at', lookup_expr='gte')
    reported_before = filters.DateTimeFilter(field_name='reported_at', lookup_expr='lte')
    
    class Meta:
        model = ExamMalpractice
        fields = ['exam', 'student_id', 'severity', 'status']