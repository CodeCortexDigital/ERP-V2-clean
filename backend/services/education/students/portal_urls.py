from django.urls import path

from . import portal

urlpatterns = [
    path('children/', portal.children, name='portal-children'),
    path('documents/<str:doc_id>/', portal.document_detail, name='portal-document'),
    path('<str:student_id>/overview/', portal.overview, name='portal-overview'),
    path('<str:student_id>/assignments/', portal.assignments, name='portal-assignments'),
    path('<str:student_id>/homework/<str:homework_id>/attachment/', portal.homework_attachment, name='portal-homework-attachment'),
    path('<str:student_id>/progress/', portal.progress, name='portal-progress'),
    path('<str:student_id>/documents/', portal.documents, name='portal-documents'),
]
