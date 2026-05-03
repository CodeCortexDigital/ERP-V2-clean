from django.contrib import admin
from .models import Course, Program, AcademicYear, SchoolClass, Section

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'credits', 'is_active')
    search_fields = ('code', 'name')

@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'duration_years')

@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_current', 'is_active')
    list_filter = ('is_current', 'is_active')

@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'academic_year', 'teacher_name', 'capacity', 'is_active')
    list_filter = ('is_active', 'academic_year')

@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('class_ref', 'name', 'code', 'capacity', 'is_active')
    list_filter = ('is_active',)
