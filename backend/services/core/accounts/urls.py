from django.urls import path
from .views import TenantListView

urlpatterns = [
    path('tenants/', TenantListView.as_view(), name='tenant-list'),
]

# Keep existing patterns if any
