from django.urls import path

from . import discipline as d

urlpatterns = [
    path('categories/', d.categories, name='behaviour-categories'),
    path('categories/<str:cat_id>/', d.category_detail, name='behaviour-category'),
    path('settings/', d.behaviour_settings, name='behaviour-settings'),
    path('incidents/', d.incidents, name='behaviour-incidents'),
    path('incidents/<str:incident_id>/', d.incident_detail, name='behaviour-incident'),
    path('incidents/<str:incident_id>/actions/', d.add_action, name='behaviour-incident-actions'),
    path('actions/<str:action_id>/', d.action_detail, name='behaviour-action'),
    path('classes/', d.my_classes, name='behaviour-my-classes'),
    path('classes/<str:class_id>/points/', d.class_points, name='behaviour-class-points'),
    path('students/<str:student_id>/summary/', d.student_summary, name='behaviour-student-summary'),
    path('report/', d.report, name='behaviour-report'),
]
