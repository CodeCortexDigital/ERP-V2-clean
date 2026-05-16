from django.urls import path

from api.v1 import views

urlpatterns = [
    path('<str:id>/force-activity/', views.force_update_activity, name='student-force-activity'),
    path('<str:id>/update-activity/', views.update_student_activity, name='student-update-activity'),
    path('', views.StudentListCreateView.as_view(), name='student-list'),
    path('<str:id>/', views.StudentDetailView.as_view(), name='student-detail'),
    path('by-id/<str:student_id>/', views.get_student_by_id, name='student-by-id'),
    path('student-360/<str:student_id>/', views.student_360, name='student-360'),
]
