from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.academic_dashboard, name='academic-dashboard'),
    
    # Academic Years
    path('academic-years/', views.academic_years, name='academic-years'),
    path('academic-years/create/', views.create_academic_year, name='create-academic-year'),
    path('academic-years/<str:year_id>/', views.update_academic_year, name='update-academic-year'),
    
    # Classes
    path('classes/', views.class_list, name='classes'),
    path('classes/create/', views.create_class, name='create-class'),
    path('classes/<str:class_id>/subjects/', views.class_subjects, name='class-subjects'),
    
    # Sections
    path('sections/by-class/<str:class_id>/', views.sections_by_class, name='sections-by-class'),
    path('sections/create/', views.create_section, name='create-section'),
    
    # Courses
    path('courses/', views.courses, name='courses'),
    path('courses/create/', views.create_course, name='create-course'),
    
    # Hierarchy
    path('hierarchy/', views.academic_hierarchy, name='academic-hierarchy'),
    
    # Advanced Features
    path('bulk/assign-teacher/', views.bulk_assign_teacher, name='bulk-assign-teacher'),
    path('bulk/assign-subjects/', views.bulk_assign_subjects, name='bulk-assign-subjects'),
    path('promote-students/', views.promote_students, name='promote-students'),
    path('clone-year/', views.clone_academic_year, name='clone-year'),
]
