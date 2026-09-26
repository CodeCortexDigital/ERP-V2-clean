from django.urls import path

from . import api

urlpatterns = [
    path('legal/school/<str:code>/', api.school_notice, name='privacy-school-notice'),
    path('legal/<str:kind>/', api.legal, name='privacy-legal'),
    path('pending/', api.pending, name='privacy-pending'),
    path('accept/', api.accept, name='privacy-accept'),
    path('me/', api.me, name='privacy-me'),
    path('consent/', api.give_consent, name='privacy-consent'),
    path('requests/new/', api.make_request, name='privacy-request-new'),
    path('photo-consent/', api.photo_consent, name='privacy-photo-consent'),
    path('documents/', api.documents, name='privacy-documents'),
    path('consent-types/', api.manage_consent_types, name='privacy-consent-types'),
    path('consent-report/', api.consent_report, name='privacy-consent-report'),
    path('requests/', api.requests_list, name='privacy-requests'),
    path('requests/<uuid:request_id>/', api.request_update, name='privacy-request'),
    path('incidents/report/', api.report_incident, name='privacy-report-incident'),
    path('platform/documents/', api.platform_documents, name='privacy-platform-documents'),
    path('platform/subprocessors/', api.platform_subprocessors, name='privacy-platform-subprocessors'),
    path('platform/incidents/', api.platform_incidents, name='privacy-platform-incidents'),
    path('platform/incidents/<uuid:incident_id>/', api.platform_incident, name='privacy-platform-incident'),
]
