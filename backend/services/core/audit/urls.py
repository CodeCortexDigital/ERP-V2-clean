from django.urls import path
from . import views

urlpatterns = [
    path('gdpr/export/<uuid:user_id>/', views.GDPRExportView.as_view(), name='gdpr-export'),
    path('gdpr/anonymize/<uuid:user_id>/', views.AnonymizeUserView.as_view(), name='gdpr-anonymize'),
    path('logs/', views.AuditLogListView.as_view(), name='audit-log-list'),
]
