from django.contrib import admin
from .models import Applicant, Application

@admin.register(Applicant)
class ApplicantAdmin(admin.ModelAdmin):
    list_display = ('applicant_id', 'full_name', 'email', 'phone', 'status', 'created_at')
    search_fields = ('applicant_id', 'first_name', 'last_name', 'email')
    list_filter = ('status', 'gender', 'created_at')
    readonly_fields = ('applicant_id', 'created_at', 'updated_at')

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('application_number', 'applicant', 'program', 'academic_year', 'status', 'submitted_at')
    search_fields = ('application_number', 'applicant__first_name', 'applicant__last_name')
    list_filter = ('status', 'program', 'academic_year')
    readonly_fields = ('application_number', 'submitted_at', 'updated_at')
