from django.urls import path

from . import views

urlpatterns = [
    path('upload/', views.upload_file, name='storage-upload'),
    path('files/<uuid:file_id>/download-url/', views.signed_download_url, name='storage-signed-url'),
    path('download-url/', views.signed_download_by_key, name='storage-signed-url-by-key'),
]
