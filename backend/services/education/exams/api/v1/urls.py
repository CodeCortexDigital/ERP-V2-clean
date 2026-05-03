from django.urls import path, include
from rest_framework.routers import DefaultRouter
from exams.views import (
    ExamTypeViewSet, ExamViewSet, ExamRegistrationViewSet,
    ExamResultViewSet, ExamScheduleViewSet, ExamInvigilatorViewSet,
    ExamMalpracticeViewSet
)

router = DefaultRouter()
router.register(r'exam-types', ExamTypeViewSet, basename='examtype')
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'registrations', ExamRegistrationViewSet, basename='registration')
router.register(r'results', ExamResultViewSet, basename='result')
router.register(r'schedules', ExamScheduleViewSet, basename='schedule')
router.register(r'invigilators', ExamInvigilatorViewSet, basename='invigilator')
router.register(r'malpractices', ExamMalpracticeViewSet, basename='malpractice')

urlpatterns = [
    path('', include(router.urls)),
]