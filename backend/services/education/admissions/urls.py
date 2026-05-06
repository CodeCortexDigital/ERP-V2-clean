from django.urls import path
from . import views

urlpatterns = [
    path('applicants/', views.ApplicantListCreateView.as_view(), name='applicant-list'),
    path('applicants/<str:id>/', views.ApplicantDetailView.as_view(), name='applicant-detail'),
    path('applications/', views.ApplicationListCreateView.as_view(), name='application-list'),
    path('applications/<str:id>/', views.ApplicationDetailView.as_view(), name='application-detail'),
    path('applications/<str:id>/update-status/', views.update_application_status, name='update-status'),
    path('applications/<str:id>/convert-to-student/', views.convert_to_student, name='convert-to-student'),
]
