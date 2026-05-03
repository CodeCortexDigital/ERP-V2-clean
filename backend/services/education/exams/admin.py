from django.contrib import admin
from .models import Exam, ExamResult

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'total_marks', 'status', 'exam_date')
    search_fields = ('code', 'title')
    list_filter = ('status', 'exam_date')

@admin.register(ExamResult)
class ExamResultAdmin(admin.ModelAdmin):
    list_display = ('exam', 'student', 'obtained_marks', 'percentage', 'grade', 'is_pass')
    search_fields = ('student__full_name', 'student__student_id')
    list_filter = ('is_pass', 'exam')
    raw_id_fields = ('student', 'exam')
    readonly_fields = ('percentage', 'grade', 'is_pass')
