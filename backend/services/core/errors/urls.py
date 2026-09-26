from django.urls import path

from . import api

urlpatterns = [
    path('client/', api.client_error, name='errors-client'),
    path('', api.groups, name='errors'),
    path('<uuid:group_id>/', api.group, name='errors-group'),
]
