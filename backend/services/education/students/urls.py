from django.urls import path
from . import views

urlpatterns = [
    path('student-360/<str:student_id>/', views.student_360, name='student-360'),
]
