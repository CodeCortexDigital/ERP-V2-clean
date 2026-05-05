from django.urls import path
from . import views

urlpatterns = [
    path('applicants/', views.applicant_list, name='applicant-list'),
    path('applicants/enrolled/', views.enrolled_applicants, name='enrolled-applicants'),
    path('applicants/create/', views.applicant_create, name='applicant-create'),
    path('applicants/<str:applicant_id>/', views.applicant_detail, name='applicant-detail'),
    path('applicants/<str:applicant_id>/convert/', views.convert_to_student, name='convert-to-student'),
    path('applicants/<str:applicant_id>/status/', views.update_applicant_status, name='update-status'),
    path('applicants/<str:applicant_id>/delete/', views.delete_applicant, name='delete-applicant'),
]
