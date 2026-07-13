"""
API v1 URL configuration.
"""

from django.urls import path, include
from . import views

# ✅ Import from academics - these support both GET and POST
from services.education.academics.views import (
    TeacherListCreateView,
    TeacherDetailView,
)

# ✅ Import from finance - canonical class-based views
from services.education.finance.views import (
    FeeStructureListCreateView,
    FeeStructureDetailView,
    PaymentListCreateView,
    PaymentDetailView,
    ScholarshipListCreateView,
    ScholarshipDetailView,
    StudentScholarshipListCreateView,
    StudentScholarshipDetailView,
    LateFeeRuleListCreateView,
    LateFeeRuleDetailView,
)

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
    # TEACHERS - ✅ USING ACADEMICS VIEWS (they support GET and POST)
    # ============================================================
    path('teachers/', TeacherListCreateView.as_view(), name='teacher-list'),
    path('teachers/<str:id>/', TeacherDetailView.as_view(), name='teacher-detail'),
    path('auth/teachers/', TeacherListCreateView.as_view(), name='auth-teacher-list'),
    path('auth/teachers/<str:id>/', TeacherDetailView.as_view(), name='auth-teacher-detail'),
    
    # ============================================================
    # INVOICES
    # ============================================================
    path('invoices/', views.invoices_list_view, name='invoices-list'),
    path('invoices/<str:id>/', views.invoice_detail_view, name='invoice-detail'),
    path('auth/invoices/', views.invoices_list_view, name='auth-invoices-list'),
    path('auth/invoices/<str:id>/', views.invoice_detail_view, name='auth-invoice-detail'),
    
    # ============================================================
    # PAYMENTS & ATTENDANCE
    # ============================================================
    path('payments/', PaymentListCreateView.as_view(), name='payments-list'),
    path('payments/<str:id>/', PaymentDetailView.as_view(), name='payment-detail'),
    path('attendance/dashboard-stats/', views.get_attendance_dashboard_stats, name='attendance-dashboard-stats'),
    
    # ============================================================
    # FINANCE ENDPOINTS
    # ============================================================
    path('fee-structures/', FeeStructureListCreateView.as_view(), name='fee-structures'),
    path('fee-structures/<str:id>/', FeeStructureDetailView.as_view(), name='fee-structure-detail'),
    path('scholarships/', ScholarshipListCreateView.as_view(), name='scholarships'),
    path('scholarships/<str:id>/', ScholarshipDetailView.as_view(), name='scholarship-detail'),
    path('student-scholarships/', StudentScholarshipListCreateView.as_view(), name='student-scholarships'),
    path('student-scholarships/<str:id>/', StudentScholarshipDetailView.as_view(), name='student-scholarship-detail'),
    path('late-fee-rules/', LateFeeRuleListCreateView.as_view(), name='late-fee-rules'),
    path('late-fee-rules/<str:id>/', LateFeeRuleDetailView.as_view(), name='late-fee-rule-detail'),
    
    # ============================================================
    # SUBJECTS
    # ============================================================
    path('subjects/', views.subjects_list_view, name='subjects-list'),
    path('subjects/<str:id>/', views.subject_detail_view, name='subject-detail'),
    path('auth/subjects/', views.subjects_list_view, name='auth-subjects-list'),
    path('auth/subjects/<str:id>/', views.subject_detail_view, name='auth-subject-detail'),
    
    # ============================================================
    # CLASS SUBJECTS
    # ============================================================
    path('class-subjects/', views.class_subjects_list_view, name='class-subjects-list'),
    path('class-subjects/<str:id>/', views.class_subject_detail_view, name='class-subject-detail'),
    path('auth/class-subjects/', views.class_subjects_list_view, name='auth-class-subjects-list'),
    path('auth/class-subjects/<str:id>/', views.class_subject_detail_view, name='auth-class-subject-detail'),
    
    # ============================================================
    # CLASSES
    # ============================================================
    path('classes/', views.classes_list_view, name='classes-list'),
    path('classes/<str:id>/', views.class_detail_view, name='class-detail'),
    path('auth/classes/', views.classes_list_view, name='auth-classes-list'),
    path('auth/classes/<str:id>/', views.class_detail_view, name='auth-class-detail'),
    
    # ============================================================
    # ACADEMIC YEARS
    # ============================================================
    path('academic-years/', views.academic_years_list_view, name='academic-years-list'),
    path('academic-years/<str:id>/', views.academic_year_detail_view, name='academic-year-detail'),
    path('auth/academic-years/', views.academic_years_list_view, name='auth-academic-years-list'),
    path('auth/academic-years/<str:id>/', views.academic_year_detail_view, name='auth-academic-year-detail'),
    
    # ============================================================
    # STUDENT HISTORY
    # ============================================================
    path('students/<str:id>/history/', views.get_student_history, name='student-history'),
    path('students/<str:id>/history/summary/', views.get_student_history_summary, name='student-history-summary'),
    path('students/<str:id>/timeline/', views.get_student_timeline, name='student-timeline'),
    path('students/<str:id>/log-action/', views.log_student_action, name='student-log-action'),
    
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
    # OTHER SERVICES
    # ============================================================
    path('search/', include('services.core.search.urls')),
    path('communication/whatsapp/', include('services.communication.whatsapp.urls')),
    path('core/audit/', include('services.core.audit.urls')),
    path('storage/', include('services.core.storage.urls')),
    path('tenants/', include('services.core.tenants.urls')),
    path('features/', include('services.core.features.urls')),
    path('education/', include('services.education.urls')),
    path('auth/me/', views.current_user_view, name='current-user'),
]