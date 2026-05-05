from django.contrib import admin
from .models import AcademicYear, Program, Course, SchoolClass, Section

@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_current', 'is_active')
    list_filter = ('is_current', 'is_active')

@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'duration_years', 'is_active')
    search_fields = ('code', 'name')

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'credits', 'is_active')
    search_fields = ('code', 'name')

@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'academic_year', 'capacity', 'is_active')
    list_filter = ('is_active', 'academic_year')
    search_fields = ('code', 'name')
    
    fieldsets = (
        ('Class Information', {
            'fields': ('code', 'name', 'academic_year', 'capacity')
        }),
        ('Teacher Information', {
            'fields': ('teacher_name', 'teacher_email'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('class_ref', 'name', 'code', 'capacity', 'is_active')
    list_filter = ('is_active', 'class_ref')
    search_fields = ('name', 'code')
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'class_ref':
            kwargs['queryset'] = SchoolClass.objects.filter(is_active=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
