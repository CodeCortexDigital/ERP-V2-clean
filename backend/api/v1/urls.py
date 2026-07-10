"""
API v1 URL configuration.
"""

from django.urls import path, include
from . import views

urlpatterns = [
    path('health/', include('services.core.health.urls')),
    
    # ============================================================
    # AUTH & IDENTITY
    # ============================================================
    path('auth/', include('services.core.accounts.urls')),
    path('auth/', include('services.core.audit_api.urls')),
    path('', include('services.core.audit_api.urls')),
    
    # ============================================================
    # STUDENTS
    # ============================================================
    path('students/', include('api.v1.student_urls')),
    path('auth/students/', include('api.v1.student_urls')),
    
    # ============================================================
    # PAYMENTS & ATTENDANCE
    # ============================================================
    path('payments/', views.get_payments_list, name='payments-list'),
    path('attendance/dashboard-stats/', views.get_attendance_dashboard_stats, name='attendance-dashboard-stats'),
    
    # ============================================================
    # FINANCE ENDPOINTS
    # ============================================================
    path('fee-structures/', views.get_fee_structures, name='fee-structures'),
    path('scholarships/', views.get_scholarships, name='scholarships'),
    path('invoices/', views.get_payments_list, name='invoices-list'),
    
    # ============================================================
    # LEGACY NESTED PATHS (Backward Compatible)
    # ============================================================
    path('auth/academics/', include('services.education.academics.urls')),
    path('auth/finance/', include('services.education.finance.urls')),
    path('auth/attendance/', include('services.education.attendance.urls')),
    path('auth/exams/', include('services.education.exams.urls')),
    path('auth/admissions/', include('services.education.admissions.urls')),
    path('auth/analytics/', include('services.analytics.urls')),
    
    # ============================================================
    # API ACADEMICS - NEW PATH
    # ============================================================
    # Academic Years
    path('academics/academic-years/', views.academic_years_list_view, name='api-academics-academic-years-list'),
    path('academics/academic-years/<str:id>/', views.academic_year_detail_view, name='api-academics-academic-year-detail'),
    
    # Subjects
    path('academics/subjects/', views.subjects_list_view, name='api-academics-subjects-list'),
    path('academics/subjects/<str:id>/', views.subject_detail_view, name='api-academics-subject-detail'),
    
    # Class Subjects
    path('academics/class-subjects/', views.class_subjects_list_view, name='api-academics-class-subjects-list'),
    path('academics/class-subjects/<str:id>/', views.class_subject_detail_view, name='api-academics-class-subject-detail'),
    
    # Classes
    path('academics/classes/', views.classes_list_view, name='api-academics-classes-list'),
    path('academics/classes/<str:id>/', views.class_detail_view, name='api-academics-class-detail'),
    
    # Auth versions
    path('auth/academics-api/academic-years/', views.academic_years_list_view, name='auth-api-academics-academic-years-list'),
    path('auth/academics-api/academic-years/<str:id>/', views.academic_year_detail_view, name='auth-api-academics-academic-year-detail'),
    path('auth/academics-api/subjects/', views.subjects_list_view, name='auth-api-academics-subjects-list'),
    path('auth/academics-api/subjects/<str:id>/', views.subject_detail_view, name='auth-api-academics-subject-detail'),
    path('auth/academics-api/class-subjects/', views.class_subjects_list_view, name='auth-api-academics-class-subjects-list'),
    path('auth/academics-api/class-subjects/<str:id>/', views.class_subject_detail_view, name='auth-api-academics-class-subject-detail'),
    path('auth/academics-api/classes/', views.classes_list_view, name='auth-api-academics-classes-list'),
    path('auth/academics-api/classes/<str:id>/', views.class_detail_view, name='auth-api-academics-class-detail'),
    
    # ============================================================
    # OTHER SERVICES
    # ============================================================
    path('search/', include('services.core.search.urls')),
    path('communication/whatsapp/', include('services.communication.whatsapp.urls')),
    path('core/audit/', include('services.core.audit.urls')),
    path('storage/', include('services.core.storage.urls')),
    path('tenants/', include('services.core.tenants.urls')),
    path('features/', include('services.core.features.urls')),
    path('education/', include('services.education.urls')),
]