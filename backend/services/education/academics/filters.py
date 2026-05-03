from django_filters import rest_framework as filters
from .models import Program, Course, AcademicYear, Semester, ProgramCurriculum

class ProgramFilter(filters.FilterSet):
    min_duration = filters.NumberFilter(field_name='duration_years', lookup_expr='gte')
    max_duration = filters.NumberFilter(field_name='duration_years', lookup_expr='lte')
    min_credits = filters.NumberFilter(field_name='total_credits', lookup_expr='gte')
    max_credits = filters.NumberFilter(field_name='total_credits', lookup_expr='lte')
    degree_type = filters.ChoiceFilter(choices=Program.DEGREE_TYPES)
    search = filters.CharFilter(method='filter_search')
    
    class Meta:
        model = Program
        fields = ['code', 'name', 'degree_type', 'department', 'faculty', 'is_active']
    
    def filter_search(self, queryset, name, value):
        return queryset.filter(
            models.Q(code__icontains=value) |
            models.Q(name__icontains=value) |
            models.Q(description__icontains=value)
        )

class CourseFilter(filters.FilterSet):
    program = filters.UUIDFilter(field_name='program__id')
    min_credits = filters.NumberFilter(field_name='credits', lookup_expr='gte')
    max_credits = filters.NumberFilter(field_name='credits', lookup_expr='lte')
    level = filters.ChoiceFilter(choices=Course.LEVELS)
    is_elective = filters.BooleanFilter()
    search = filters.CharFilter(method='filter_search')
    
    class Meta:
        model = Course
        fields = ['code', 'name', 'program', 'level', 'credits', 'is_elective', 'is_active']
    
    def filter_search(self, queryset, name, value):
        return queryset.filter(
            models.Q(code__icontains=value) |
            models.Q(name__icontains=value) |
            models.Q(description__icontains=value)
        )

class AcademicYearFilter(filters.FilterSet):
    min_start_date = filters.DateFilter(field_name='start_date', lookup_expr='gte')
    max_start_date = filters.DateFilter(field_name='start_date', lookup_expr='lte')
    is_current = filters.BooleanFilter()
    
    class Meta:
        model = AcademicYear
        fields = ['name', 'code', 'is_current', 'is_active']

class SemesterFilter(filters.FilterSet):
    academic_year = filters.UUIDFilter(field_name='academic_year__id')
    semester_type = filters.ChoiceFilter(choices=Semester.SEMESTER_TYPES)
    is_current = filters.BooleanFilter()
    
    class Meta:
        model = Semester
        fields = ['name', 'code', 'academic_year', 'semester_type', 'is_current', 'is_active']