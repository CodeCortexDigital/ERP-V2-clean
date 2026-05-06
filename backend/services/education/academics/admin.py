from django.contrib import admin
from .models import AcademicYear, SchoolClass, Section, Subject, ClassSubject

@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'teacher_name', 'academic_year']
    list_filter = ['academic_year']
    search_fields = ['name', 'code']


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ['class_ref', 'name', 'capacity']
    list_filter = ['class_ref']
    search_fields = ['name']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'credits']
    search_fields = ['name', 'code']


@admin.register(ClassSubject)
class ClassSubjectAdmin(admin.ModelAdmin):
    list_display = ['class_ref', 'subject']
    list_filter = ['class_ref', 'subject']
