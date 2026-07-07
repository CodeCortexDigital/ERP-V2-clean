from django.urls import path

from . import views

urlpatterns = [
    path('current/', views.current_tenant, name='tenant-current'),
    path('mine/', views.my_tenants, name='tenant-mine'),
    path('switch/', views.switch_tenant, name='tenant-switch'),
    path('schools/', views.create_school, name='tenant-create-school'),
    path('settings/', views.tenant_settings, name='tenant-settings'),
]
