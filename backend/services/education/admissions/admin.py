from django.contrib import admin
from .models import Applicant, Application

@admin.register(Applicant)
class ApplicantAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'email', 'phone', 'applying_for_class', 'created_at']
    list_filter = ['applying_for_class', 'gender', 'created_at']
    search_fields = ['full_name', 'email', 'phone', 'father_name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['application_no', 'applicant', 'status', 'submitted_at']
    list_filter = ['status', 'academic_year', 'submitted_at']
    search_fields = ['application_no', 'applicant__full_name', 'applicant__email']
    readonly_fields = ['id', 'application_no', 'submitted_at', 'updated_at']
