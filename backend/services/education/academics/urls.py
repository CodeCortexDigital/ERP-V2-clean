from django.urls import path
from . import views

urlpatterns = [
    path('', views.ClassListCreateView.as_view(), name='class-list'),
    path('<str:id>/', views.ClassDetailView.as_view(), name='class-detail'),
    path('<str:class_id>/sections/', views.get_sections, name='class-sections'),
]
