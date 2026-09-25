from django.urls import path
from . import views

urlpatterns = [
    # Public (no login)
    path('public/status/', views.public_status, name='admission-public-status'),
    path('public/<str:slug>/', views.public_form, name='admission-public-form'),
    path('public/<str:slug>/apply/', views.public_apply, name='admission-public-apply'),
    # School administrators
    path('settings/', views.admissions_settings, name='admission-settings'),
    path('applicants/', views.ApplicantListCreateView.as_view(), name='applicant-list'),
    path('applicants/<str:id>/', views.ApplicantDetailView.as_view(), name='applicant-detail'),
    path('applications/', views.ApplicationListCreateView.as_view(), name='application-list'),
    path('applications/<str:id>/', views.ApplicationDetailView.as_view(), name='application-detail'),
    path('applications/<str:id>/update-status/', views.update_application_status, name='update-status'),
    path('applications/<str:id>/notes/', views.add_note, name='application-notes'),
    path('applications/<str:id>/documents/', views.upload_documents, name='application-documents'),
    path('applications/<str:id>/documents/<str:doc_id>/', views.delete_document, name='application-document'),
    path('applications/<str:id>/convert-to-student/', views.convert_to_student, name='convert-to-student'),
    path('applications/<str:id>/enroll/', views.convert_to_student, name='application-enroll'),
    # Re-enrolment
    path('reenrollment/', views.reenrollment_campaigns, name='reenrollment-list'),
    path('reenrollment/mine/', views.my_reenrollments, name='reenrollment-mine'),
    path('reenrollment/responses/<str:id>/', views.reenrollment_record, name='reenrollment-record'),
    path('reenrollment/responses/<str:id>/respond/', views.respond_reenrollment, name='reenrollment-respond'),
    path('reenrollment/<str:id>/', views.reenrollment_campaign_detail, name='reenrollment-detail'),
]
