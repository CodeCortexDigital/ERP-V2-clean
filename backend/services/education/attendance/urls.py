from django.urls import path
from . import views
from . import analytics_views
from . import register
from .views import class_attendance_statistics, student_attendance_history, student_attendance_summary

urlpatterns = [
    # Student-scoped attendance (must precede generic <str:id>/ detail)
    path('student/<str:student_id>/summary/', student_attendance_summary, name='student-attendance-summary'),
    path('student/<str:student_id>/calendar/', register.student_calendar, name='student-attendance-calendar'),
    path('student/<str:student_id>/day/<str:day>/', register.update_daily_record, name='student-attendance-day'),
    path('student/<str:student_id>/', student_attendance_history, name='student-attendance-history'),
    # Codes, lessons, absence reports and alerts
    path('settings/', register.attendance_settings, name='attendance-settings'),
    path('periods/', register.period_roster, name='attendance-period-roster'),
    path('periods/save/', register.save_period_attendance, name='attendance-period-save'),
    path('absence-reports/', register.absence_reports, name='absence-reports'),
    path('absence-reports/<str:report_id>/review/', register.review_absence_report, name='absence-report-review'),
    # Analytics and pattern detection endpoints (before <str:id>/, which would otherwise capture them)
    path('analytics/', analytics_views.attendance_analytics, name='attendance-analytics'),
    path('patterns/', analytics_views.attendance_patterns, name='attendance-patterns'),
    path('alerts/', analytics_views.attendance_alerts, name='attendance-alerts'),
    path('trends/', analytics_views.attendance_trends, name='attendance-trends'),
    path('at-risk/', analytics_views.at_risk_students, name='at-risk-students'),
    # Core attendance endpoints
    path('bulk/', views.bulk_attendance, name='attendance-bulk'),
    path('summary/', views.attendance_summary, name='attendance-summary'),
    path('class/<str:class_id>/statistics/', class_attendance_statistics, name='class-attendance-statistics'),
    path('', views.AttendanceListCreateView.as_view(), name='attendance-list'),
    path('<str:id>/', views.AttendanceDetailView.as_view(), name='attendance-detail'),
]
