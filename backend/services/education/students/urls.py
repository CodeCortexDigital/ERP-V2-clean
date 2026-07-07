from django.urls import path
from . import views

urlpatterns = [
    path('<str:id>/force-activity/', views.force_update_activity, name='force-activity'),
    path('<str:id>/update-activity/', views.update_student_activity, name='update-activity'),
    path('last-registration/', views.last_registration, name='student-last-registration'),
    path('', views.StudentListCreateView.as_view(), name='student-list'),
    path('<str:id>/', views.StudentDetailView.as_view(), name='student-detail'),
    path('by-id/<str:student_id>/', views.get_student_by_id, name='student-by-id'),
    path('student-360/<str:student_id>/', views.student_360, name='student-360'),
]


