from django.urls import path
from . import views

urlpatterns = [
    # Schedules & Registrations (Must be above <str:id>/ to avoid matching 'schedules' as exam ID)
    path('schedules/', views.exam_schedules_list_create, name='exam-schedules-list'),
    path('schedules/<str:schedule_id>/', views.exam_schedule_detail, name='exam-schedule-detail'),
    path('registrations/', views.exam_registrations_list_create, name='exam-registrations-list'),
    path('registrations/<str:reg_id>/', views.exam_registration_detail, name='exam-registration-detail'),
    path('registrations/<str:reg_id>/generate-admit-card/', views.generate_admit_card, name='generate-admit-card'),

    # Exams
    path('', views.ExamListCreateView.as_view(), name='exam-list'),

    # Results - MUST come before `<str:id>/` so that 'results' is not captured as an exam id
    path('results/', views.get_exam_results, name='get-results'),
    path('results/create/', views.create_exam_result, name='create-result'),
    path('results/<str:result_id>/delete/', views.delete_exam_result, name='delete-result'),

    path('<str:id>/', views.ExamDetailView.as_view(), name='exam-detail'),

    # Bulk operations
    path('<str:exam_id>/bulk-results/', views.bulk_enter_results, name='bulk-results'),
    path('<str:exam_id>/summary/', views.exam_summary, name='exam-summary'),
]
