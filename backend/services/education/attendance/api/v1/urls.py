from django.urls import path, include
from rest_framework.routers import DefaultRouter
from attendance.views import (
    AttendanceSessionViewSet, AttendanceRecordViewSet,
    AttendanceSummaryViewSet, CourseAttendanceSummaryViewSet
)

router = DefaultRouter()
router.register(r'sessions', AttendanceSessionViewSet, basename='attendance-session')
router.register(r'records', AttendanceRecordViewSet, basename='attendance-record')
router.register(r'summaries', AttendanceSummaryViewSet, basename='attendance-summary')
router.register(r'course-summaries', CourseAttendanceSummaryViewSet, basename='course-summary')

urlpatterns = [
    path('', include(router.urls)),
]