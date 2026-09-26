from django.urls import path
from . import views

urlpatterns = [
    path('gdpr/export/<uuid:user_id>/', views.GDPRExportView.as_view(), name='gdpr-export'),
    path('logs/', views.AuditLogListView.as_view(), name='audit-log-list'),
]
