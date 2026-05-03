from django.urls import path, include
from rest_framework.routers import DefaultRouter
from students.views import (
    StudentViewSet, EnrollmentViewSet, DocumentViewSet,
    NoteViewSet, GuardianViewSet
)

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'guardians', GuardianViewSet, basename='guardian')

urlpatterns = [
    path('', include(router.urls)),
]