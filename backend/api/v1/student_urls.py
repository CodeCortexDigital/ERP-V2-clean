from django.urls import path
from api.v1 import views
from services.education.students import households as hh

urlpatterns = [
    # Households, guardians and health (before the '<str:id>/' catch-all).
    path('households/', hh.HouseholdListCreateView.as_view(), name='household-list'),
    path('households/<uuid:pk>/', hh.HouseholdDetailView.as_view(), name='household-detail'),
    path('guardians/', hh.GuardianListCreateView.as_view(), name='guardian-list'),
    path('guardians/<uuid:pk>/', hh.GuardianDetailView.as_view(), name='guardian-detail'),
    path('<str:id>/profile/', hh.student_profile, name='student-profile'),
    path('<str:id>/guardians/', hh.student_guardians, name='student-guardians'),
    path('<str:id>/guardians/<uuid:link_id>/', hh.student_guardian_detail, name='student-guardian-detail'),
    path('<str:id>/health/', hh.student_health, name='student-health'),
    path('<str:id>/immunizations/', hh.student_immunizations, name='student-immunizations'),
    path('<str:id>/immunizations/<uuid:imm_id>/', hh.student_immunization_detail, name='student-immunization-detail'),
    path('<str:id>/household/', hh.student_household, name='student-household'),
    path('<str:id>/force-activity/', views.force_update_activity, name='student-force-activity'),
    path('<str:id>/update-activity/', views.update_student_activity, name='student-update-activity'),
    path('last-registration/', views.last_registration, name='student-last-registration'),
    path('', views.StudentListCreateView.as_view(), name='student-list'),
    path('<str:id>/', views.StudentDetailView.as_view(), name='student-detail'),
    path('by-id/<str:student_id>/', views.get_student_by_id, name='student-by-id'),
    path('student-360/<str:student_id>/', views.student_360, name='student-360'),
    path('<str:id>/history/', views.get_student_history, name='student-history'),
    path('<str:id>/history/summary/', views.get_student_history_summary, name='student-history-summary'),
    path('<str:id>/timeline/', views.get_student_timeline, name='student-timeline'),
    path('<str:id>/log-action/', views.log_student_action, name='student-log-action'),
]