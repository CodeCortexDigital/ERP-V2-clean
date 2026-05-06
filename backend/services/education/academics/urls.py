from django.urls import path
from . import views

urlpatterns = [
    path('academic-years/', views.AcademicYearListCreateView.as_view(), name='academic-year-list'),
    path('classes/', views.SchoolClassListCreateView.as_view(), name='class-list'),
    path('classes/<str:id>/', views.SchoolClassDetailView.as_view(), name='class-detail'),
    path('classes/<str:class_id>/sections/', views.ClassSectionsView.as_view(), name='class-sections'),
    path('sections/', views.SectionListCreateView.as_view(), name='section-list'),
    path('subjects/', views.SubjectListCreateView.as_view(), name='subject-list'),
    path('subjects/<str:id>/', views.SubjectDetailView.as_view(), name='subject-detail'),
]
