from django.urls import path

from . import family, portal

urlpatterns = [
    path('children/', portal.children, name='portal-children'),
    path('family/', family.family, name='portal-family'),
    path('family/changes/', family.request_change, name='portal-family-change'),
    path('family/applications/', family.applications, name='portal-family-applications'),
    path('family-updates/', family.change_requests, name='portal-family-updates'),
    path('family-updates/<str:id>/review/', family.review_change, name='portal-family-update-review'),
    path('documents/<str:doc_id>/', portal.document_detail, name='portal-document'),
    path('<str:student_id>/overview/', portal.overview, name='portal-overview'),
    path('<str:student_id>/assignments/', portal.assignments, name='portal-assignments'),
    path('<str:student_id>/homework/<str:homework_id>/attachment/', portal.homework_attachment, name='portal-homework-attachment'),
    path('<str:student_id>/progress/', portal.progress, name='portal-progress'),
    path('<str:student_id>/documents/', portal.documents, name='portal-documents'),
]
