from django.urls import path

from api.v2 import views

urlpatterns = [
    path('<str:id>/force-activity/', views.force_update_activity, name='v2-student-force-activity'),
    path('<str:id>/update-activity/', views.update_student_activity, name='v2-student-update-activity'),
    path('', views.StudentListCreateView.as_view(), name='v2-student-list'),
    path('<str:id>/', views.StudentDetailView.as_view(), name='v2-student-detail'),
    path('by-id/<str:student_id>/', views.get_student_by_id, name='v2-student-by-id'),
    path('student-360/<str:student_id>/', views.student_360, name='v2-student-360'),
]
