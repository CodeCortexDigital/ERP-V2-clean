from django.urls import path

from . import workspace

urlpatterns = [
    path('today/', workspace.today, name='workspace-today'),
    path('classes/', workspace.classes, name='workspace-classes'),
    path('classes/<str:class_id>/', workspace.class_detail, name='workspace-class'),
    path('report/', workspace.report, name='workspace-report'),
]
