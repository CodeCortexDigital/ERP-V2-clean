from django.urls import path

from . import api

urlpatterns = [
    path('', api.backups, name='backups'),
    path('<uuid:backup_id>/verify/', api.verify, name='backup-verify'),
]
