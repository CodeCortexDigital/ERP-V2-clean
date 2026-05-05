from django.urls import path
from . import views

urlpatterns = [
    path('', views.attendance_list, name='attendance-list'),
    path('mark/', views.mark_attendance, name='mark-attendance'),
    path('bulk/', views.bulk_mark_attendance, name='bulk-attendance'),
]
