from django.urls import path
from . import views

urlpatterns = [
    path('teachers/', views.get_teachers, name='audit-teachers'),
    path('sections/', views.get_sections, name='audit-sections'),
    path('subjects/', views.get_subjects, name='audit-subjects'),
    path('timetables/', views.get_timetables, name='audit-timetables'),
    path('timetable-entries/', views.get_timetables, name='audit-timetable-entries'),
    path('periods/', views.get_periods, name='audit-periods'),
    path('parents/', views.get_parents, name='audit-parents'),
    path('admissions/', views.get_admissions, name='audit-admissions'),
    path('staff/', views.get_staff, name='audit-staff'),
    path('dashboard/', views.get_dashboard_stats, name='audit-dashboard'),
    path('dashboard/stats/', views.get_dashboard_stats, name='audit-dashboard-stats'),
    path('profile/', views.get_profile, name='audit-profile'),
    path('attendance/data/', views.get_attendance_data, name='audit-attendance-data'),
]
