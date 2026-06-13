from django.urls import path
from . import views
from . import analytics_views

urlpatterns = [
    # Core attendance endpoints
    path('bulk/', views.bulk_attendance, name='attendance-bulk'),
    path('summary/', views.attendance_summary, name='attendance-summary'),
    path('', views.AttendanceListCreateView.as_view(), name='attendance-list'),
    path('<str:id>/', views.AttendanceDetailView.as_view(), name='attendance-detail'),
    
    # Analytics and pattern detection endpoints
    path('analytics/', analytics_views.attendance_analytics, name='attendance-analytics'),
    path('patterns/', analytics_views.attendance_patterns, name='attendance-patterns'),
    path('alerts/', analytics_views.attendance_alerts, name='attendance-alerts'),
    path('trends/', analytics_views.attendance_trends, name='attendance-trends'),
    path('at-risk/', analytics_views.at_risk_students, name='at-risk-students'),
]
