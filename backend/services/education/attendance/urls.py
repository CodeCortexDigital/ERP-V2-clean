from django.urls import path
from . import views

urlpatterns = [
    path('bulk/', views.bulk_attendance, name='attendance-bulk'),
    path('summary/', views.attendance_summary, name='attendance-summary'),
    path('', views.AttendanceListCreateView.as_view(), name='attendance-list'),
    path('<str:id>/', views.AttendanceDetailView.as_view(), name='attendance-detail'),
]
