from django.urls import path
from . import views

urlpatterns = [
    path('', views.StudentListCreateView.as_view(), name='student-list'),
    path('<str:id>/', views.StudentDetailView.as_view(), name='student-detail'),
    path('student-360/<str:student_id>/', views.student_360, name='student-360'),
]
