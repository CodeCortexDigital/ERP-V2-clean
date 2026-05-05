from django.urls import path, include

urlpatterns = [
    path('students/', include('services.education.students.urls')),
    path('attendance/', include('services.education.attendance.urls')),
]
