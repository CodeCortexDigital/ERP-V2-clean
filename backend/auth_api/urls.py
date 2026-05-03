from django.urls import path
from .views import LoginView, MeView, StudentsView, CoursesView, ExamsView, AttendanceView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('me/', MeView.as_view(), name='me'),
    path('students/', StudentsView.as_view(), name='students'),
    path('courses/', CoursesView.as_view(), name='courses'),
    path('exams/', ExamsView.as_view(), name='exams'),
    path('attendance/', AttendanceView.as_view(), name='attendance'),
]
