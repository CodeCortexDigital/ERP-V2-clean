from django.urls import path
from api.v1 import views

urlpatterns = [
    path('<str:id>/force-activity/', views.force_update_activity, name='student-force-activity'),
    path('<str:id>/update-activity/', views.update_student_activity, name='student-update-activity'),
    path('last-registration/', views.last_registration, name='student-last-registration'),
    path('', views.StudentListCreateView.as_view(), name='student-list'),
    path('<str:id>/', views.StudentDetailView.as_view(), name='student-detail'),
    path('by-id/<str:student_id>/', views.get_student_by_id, name='student-by-id'),
    path('student-360/<str:student_id>/', views.student_360, name='student-360'),
    path('<str:id>/history/', views.get_student_history, name='student-history'),
    path('<str:id>/history/summary/', views.get_student_history_summary, name='student-history-summary'),
    path('<str:id>/timeline/', views.get_student_timeline, name='student-timeline'),
    path('<str:id>/log-action/', views.log_student_action, name='student-log-action'),
]