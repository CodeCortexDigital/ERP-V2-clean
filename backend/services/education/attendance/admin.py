from django.contrib import admin
from .models import AttendanceRecord

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('student', 'date', 'status', 'created_at')
    list_filter = ('status', 'date')
    search_fields = ('student__full_name', 'student__student_id')
    raw_id_fields = ('student',)
