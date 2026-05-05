from django.contrib import admin
from .models import Student

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'full_name', 'email', 'current_class', 'current_section', 'is_active')
    list_filter = ('is_active', 'current_class', 'current_section')
    search_fields = ('student_id', 'full_name', 'email')
    raw_id_fields = ('current_class', 'current_section')
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student_id', 'full_name', 'email', 'phone')
        }),
        ('Academic Placement', {
            'fields': ('current_class', 'current_section', 'program', 'enrollment_date')
        }),
        ('Guardian Information', {
            'fields': ('father_name', 'mother_name', 'guardian_phone', 'guardian_email'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
