from django.contrib import admin
from .models import Applicant, Application

@admin.register(Applicant)
class ApplicantAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'email', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('first_name', 'last_name', 'email')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('id', 'applicant', 'program', 'status', 'submitted_at')
    list_filter = ('status', 'program')
    search_fields = ('applicant__first_name', 'applicant__last_name', 'program')
