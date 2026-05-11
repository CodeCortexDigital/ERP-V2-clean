from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import teacher_views

urlpatterns = [
    path('notifications/', include('services.core.user_notifications.urls')),
    # Basic auth
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.get_current_user, name='get_current_user'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Parent Portal
    path('parent/dashboard/', views.ParentDashboardView.as_view(), name='parent-dashboard'),
    
    # Teacher Portal
    path('teacher/dashboard/', teacher_views.TeacherDashboardView.as_view(), name='teacher-dashboard'),
    path('teacher/class/<uuid:class_id>/students/', teacher_views.TeacherClassStudentsView.as_view(), name='teacher-class-students'),
    path('teacher/attendance/mark/', teacher_views.TeacherMarkAttendanceView.as_view(), name='teacher-mark-attendance'),
    path('teacher/exam/marks/', teacher_views.TeacherExamMarksView.as_view(), name='teacher-exam-marks'),
]

urlpatterns += [
]




