from django.urls import path, include
from services.core.security.tokens import SafeTokenRefreshView
from . import views
from . import teacher_views
from . import views_auth
from . import credential_views
from .firebase_views import FirebaseLoginView

urlpatterns = [
    path('attendance/working/', views.bulk_attendance_working, name='bulk-attendance-working'),
    path('notifications/', include('services.core.user_notifications.urls')),
    
    # Basic auth
    path('login/', views.login_view, name='login'),
    path('login/2fa/', views.login_two_factor_view, name='login-two-factor'),
    path('firebase/login/', FirebaseLoginView.as_view(), name='firebase-login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.get_current_user, name='get_current_user'),
    path('my-teacher-profile/', views.get_my_teacher_profile, name='my-teacher-profile'),
    path('token/refresh/', SafeTokenRefreshView.as_view(), name='token_refresh'),
    path('settings/change-password/', credential_views.change_password, name='change-password-self'),

    # Portal logins issued on admission / job offer letters (admin only)
    path('credentials/student/<uuid:pk>/', credential_views.student_credential_detail, name='student-credentials'),
    path('credentials/student/<uuid:pk>/reset/', credential_views.student_credential_reset, name='student-credentials-reset'),
    path('credentials/teacher/<uuid:pk>/', credential_views.teacher_credential_detail, name='teacher-credentials'),
    path('credentials/teacher/<uuid:pk>/reset/', credential_views.teacher_credential_reset, name='teacher-credentials-reset'),
    path('credentials/<str:kind>/', credential_views.credential_list, name='credential-list'),
    path('credentials/<str:kind>/issue-missing/', credential_views.credential_issue_missing, name='credential-issue-missing'),
    
    # Students
    path('students/', views.student_list, name='student-list'),
    path('students/count/', views.student_count, name='student-count'),
    path('students/<str:pk>/', views.StudentDetailView.as_view(), name='student-detail'),
    
    # Classes
    path('classes/', views.ClassListCreateView.as_view(), name='class-list'),
    path('classes/<uuid:pk>/', views.ClassDetailView.as_view(), name='class-detail'),
    path('select-options/<str:option_type>/', views.select_options, name='select-options'),
    
    # Attendance
    path('attendance/dashboard-stats/', views.dashboard_attendance_stats, name='attendance-dashboard-stats'),
    path('attendance/', views.get_attendance, name='get-attendance'),
    path('attendance/bulk/', views.bulk_attendance, name='bulk-attendance'),
    path('attendance/stats/', views.attendance_stats, name='attendance-stats'),
    
    # Parent Portal
    path('parent/dashboard/', views.ParentDashboardView.as_view(), name='parent-dashboard'),
    
    # Teacher Portal
    path('teacher/dashboard/', teacher_views.TeacherDashboardView.as_view(), name='teacher-dashboard'),
    path('teacher/class/<uuid:class_id>/students/', teacher_views.TeacherClassStudentsView.as_view(), name='teacher-class-students'),
    path('teacher/attendance/mark/', teacher_views.TeacherMarkAttendanceView.as_view(), name='teacher-mark-attendance'),
    path('teacher/exam/marks/', teacher_views.TeacherExamMarksView.as_view(), name='teacher-exam-marks'),
    path('attendance/student/<uuid:student_id>/', views.student_attendance, name='student-attendance'),
    
    # Analytics
    path('analytics/attendance-trends/', views.attendance_trends, name='attendance-trends'),
    path('analytics/fee-trends/', views.fee_trends, name='fee-trends'),
    path('analytics/at-risk-students/', views.at_risk_students, name='at-risk-students'),
    path('analytics/ai-insights/', views.ai_insights, name='ai-insights'),
    path('analytics/student-growth/', views.student_growth, name='student-growth'),
    path('analytics/teacher-performance/', views.teacher_performance, name='teacher-performance'),

    
    # PDF Generation
    path('pdf/result-card/<uuid:student_id>/', views.download_result_card, name='result-card'),
    path('pdf/fee-receipt/<str:invoice_id>/', views.download_fee_receipt, name='fee-receipt'),
]
