from django.contrib import admin
from .models import Student

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'full_name', 'email', 'phone', 'is_active')
    search_fields = ('student_id', 'full_name', 'email')
