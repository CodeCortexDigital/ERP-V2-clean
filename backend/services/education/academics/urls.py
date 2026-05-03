from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'academic-years', AcademicYearViewSet)
router.register(r'programs', ProgramViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'semesters', SemesterViewSet)
router.register(r'curriculum', ProgramCurriculumViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
