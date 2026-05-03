import django_filters
from django_filters import rest_framework as filters
from django.db import models
from .models import Student, Enrollment, Document, Note, Guardian

class StudentFilter(filters.FilterSet):
    """Advanced filter set for Student model"""
    
    # Text searches
    first_name = filters.CharFilter(lookup_expr='icontains')
    last_name = filters.CharFilter(lookup_expr='icontains')
    email = filters.CharFilter(lookup_expr='icontains')
    student_id = filters.CharFilter(lookup_expr='icontains')
    
    # Exact matches
    gender = filters.ChoiceFilter(choices=Student.GENDER_CHOICES)
    status = filters.MultipleChoiceFilter(choices=Student.STATUS_CHOICES)
    student_type = filters.ChoiceFilter(choices=Student.STUDENT_TYPE_CHOICES)
    
    # Foreign key
    program_id = filters.UUIDFilter()
    
    # Numeric ranges
    min_current_year = filters.NumberFilter(field_name='current_year', lookup_expr='gte')
    max_current_year = filters.NumberFilter(field_name='current_year', lookup_expr='lte')
    min_current_semester = filters.NumberFilter(field_name='current_semester', lookup_expr='gte')
    max_current_semester = filters.NumberFilter(field_name='current_semester', lookup_expr='lte')
    
    # Date ranges
    enrollment_date_from = filters.DateFilter(field_name='enrollment_date', lookup_expr='gte')
    enrollment_date_to = filters.DateFilter(field_name='enrollment_date', lookup_expr='lte')
    date_of_birth_from = filters.DateFilter(field_name='date_of_birth', lookup_expr='gte')
    date_of_birth_to = filters.DateFilter(field_name='date_of_birth', lookup_expr='lte')
    
    # Boolean
    is_international = filters.BooleanFilter()
    has_guardian = filters.BooleanFilter(method='filter_has_guardian')
    has_documents = filters.BooleanFilter(method='filter_has_documents')
    
    class Meta:
        model = Student
        fields = [
            'student_id', 'first_name', 'last_name', 'email',
            'gender', 'status', 'student_type', 'program_id',
            'is_international', 'current_year', 'current_semester'
        ]
    
    def filter_has_guardian(self, queryset, name, value):
        """Filter students with/without guardians"""
        if value:
            return queryset.filter(guardians__isnull=False).distinct()
        return queryset.filter(guardians__isnull=True)
    
    def filter_has_documents(self, queryset, name, value):
        """Filter students with/without documents"""
        if value:
            return queryset.filter(documents__isnull=False).distinct()
        return queryset.filter(documents__isnull=True)

class EnrollmentFilter(filters.FilterSet):
    """Filter set for Enrollment model"""
    
    student = filters.UUIDFilter(field_name='student__id')
    student_id = filters.CharFilter(field_name='student__student_id', lookup_expr='icontains')
    
    program_id = filters.UUIDFilter()
    course_id = filters.UUIDFilter()
    
    semester = filters.CharFilter(lookup_expr='icontains')
    academic_year = filters.CharFilter(lookup_expr='icontains')
    
    status = filters.MultipleChoiceFilter(choices=Enrollment.STATUS_CHOICES)
    
    min_grade = filters.NumberFilter(field_name='grade_points', lookup_expr='gte')
    max_grade = filters.NumberFilter(field_name='grade_points', lookup_expr='lte')
    
    min_attendance = filters.NumberFilter(field_name='attendance_percentage', lookup_expr='gte')
    max_attendance = filters.NumberFilter(field_name='attendance_percentage', lookup_expr='lte')
    
    enrollment_date_from = filters.DateFilter(field_name='enrollment_date', lookup_expr='gte')
    enrollment_date_to = filters.DateFilter(field_name='enrollment_date', lookup_expr='lte')
    
    class Meta:
        model = Enrollment
        fields = ['student', 'program_id', 'course_id', 'semester', 'status']

class DocumentFilter(filters.FilterSet):
    """Filter set for Document model"""
    
    student = filters.UUIDFilter(field_name='student__id')
    student_id = filters.CharFilter(field_name='student__student_id', lookup_expr='icontains')
    
    document_type = filters.MultipleChoiceFilter(choices=Document.DOCUMENT_TYPE_CHOICES)
    is_verified = filters.BooleanFilter()
    
    expiry_date_from = filters.DateFilter(field_name='expiry_date', lookup_expr='gte')
    expiry_date_to = filters.DateFilter(field_name='expiry_date', lookup_expr='lte')
    
    uploaded_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    uploaded_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    class Meta:
        model = Document
        fields = ['student', 'document_type', 'is_verified']

class NoteFilter(filters.FilterSet):
    """Filter set for Note model"""
    
    student = filters.UUIDFilter(field_name='student__id')
    student_id = filters.CharFilter(field_name='student__student_id', lookup_expr='icontains')
    
    note_type = filters.MultipleChoiceFilter(choices=Note.NOTE_TYPE_CHOICES)
    author_id = filters.UUIDFilter()
    author_name = filters.CharFilter(lookup_expr='icontains')
    
    is_private = filters.BooleanFilter()
    is_important = filters.BooleanFilter()
    
    created_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    class Meta:
        model = Note
        fields = ['student', 'note_type', 'author_id', 'is_private', 'is_important']

class GuardianFilter(filters.FilterSet):
    """Filter set for Guardian model"""
    
    student = filters.UUIDFilter(field_name='student__id')
    student_id = filters.CharFilter(field_name='student__student_id', lookup_expr='icontains')
    
    relationship = filters.MultipleChoiceFilter(choices=Guardian.RELATIONSHIP_CHOICES)
    is_primary = filters.BooleanFilter()
    is_emergency_contact = filters.BooleanFilter()
    
    email = filters.CharFilter(lookup_expr='icontains')
    phone = filters.CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = Guardian
        fields = ['student', 'relationship', 'is_primary', 'is_emergency_contact']