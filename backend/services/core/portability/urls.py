from django.urls import path

from . import api

urlpatterns = [
    path('', api.overview, name='portability'),
    path('exports/', api.create_export, name='portability-export'),
    path('exports/<uuid:export_id>/download/', api.download, name='portability-download'),
    path('deletion/', api.deletion, name='portability-deletion'),
    path('deletions/<uuid:deletion_id>/certificate/', api.certificate, name='portability-certificate'),
    path('platform/', api.platform_list, name='portability-platform'),
    path('platform/<uuid:deletion_id>/purge/', api.platform_purge, name='portability-purge'),
]
