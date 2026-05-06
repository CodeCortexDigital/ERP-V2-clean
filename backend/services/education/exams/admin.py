from django.contrib import admin
from .models import Exam, ExamResult

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ['exam_code', 'title', 'subject', 'class_ref', 'exam_date', 'total_marks', 'is_published']
    list_filter = ['exam_type', 'class_ref', 'subject', 'is_published']
    search_fields = ['title', 'exam_code', 'subject__name']
    readonly_fields = ['exam_code', 'created_at', 'updated_at']


@admin.register(ExamResult)
class ExamResultAdmin(admin.ModelAdmin):
    list_display = ['exam', 'student', 'obtained_marks', 'percentage', 'grade', 'is_pass']
    list_filter = ['exam', 'grade', 'is_pass']
    search_fields = ['student__full_name', 'exam__title']
    readonly_fields = ['percentage', 'grade', 'is_pass', 'entered_at']
