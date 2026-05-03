from django.urls import path, include
from rest_framework.routers import DefaultRouter
from ..views import (
    ProgramViewSet, CourseViewSet, ProgramCurriculumViewSet,
    AcademicYearViewSet, SemesterViewSet
)

router = DefaultRouter()
router.register(r'programs', ProgramViewSet, basename='program')
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'curriculum', ProgramCurriculumViewSet, basename='curriculum')
router.register(r'academic-years', AcademicYearViewSet, basename='academicyear')
router.register(r'semesters', SemesterViewSet, basename='semester')

urlpatterns = [
    path('', include(router.urls)),
]