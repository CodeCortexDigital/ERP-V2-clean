from django.urls import path

from . import views

urlpatterns = [
    path('', views.feature_availability, name='feature-availability'),
    path('admin/list/', views.feature_flag_list, name='feature-flag-list'),
    path('admin/<int:pk>/', views.feature_flag_update, name='feature-flag-update'),
    path('admin/upsert/', views.feature_flag_upsert, name='feature-flag-upsert'),
]
