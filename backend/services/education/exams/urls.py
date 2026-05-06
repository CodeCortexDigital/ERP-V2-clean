from django.urls import path
from . import views

urlpatterns = [
    # Exams
    path('', views.ExamListCreateView.as_view(), name='exam-list'),
    path('<str:id>/', views.ExamDetailView.as_view(), name='exam-detail'),
    
    # Results - Using function-based views
    path('results/', views.get_exam_results, name='get-results'),
    path('results/create/', views.create_exam_result, name='create-result'),
    path('results/<str:result_id>/delete/', views.delete_exam_result, name='delete-result'),
    
    # Bulk operations
    path('<str:exam_id>/bulk-results/', views.bulk_enter_results, name='bulk-results'),
    path('<str:exam_id>/summary/', views.exam_summary, name='exam-summary'),
]
