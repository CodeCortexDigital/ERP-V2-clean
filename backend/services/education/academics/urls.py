from django.urls import path
from . import views_api
from . import views

urlpatterns = [
    path('classes/', views.class_list, name='class-list'),
    path('classes-with-sections/', views_api.get_classes_with_sections, name='classes-with-sections'),
    path('sections-for-class/<str:class_id>/', views_api.get_sections_for_class, name='sections-for-class'),
]
