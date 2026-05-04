from django.urls import path
from . import views

urlpatterns = [
    path('test/', views.test_endpoint, name='test'),
    path('student-360/<str:student_id>/', views.student_360, name='student-360'),
    path('student-dashboard/<str:student_id>/', views.student_dashboard, name='student-dashboard'),
]
