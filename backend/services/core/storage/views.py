from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import ensure_student_access
from services.education.students.models import Student

from .models import StoredFile
from .permissions import can_access_file, log_file_download
from .storage import StorageService, get_media_service
from .utils import resolve_tenant_code


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_file(request):
    """
    POST multipart: file, bucket_type (media|reports), purpose (generic|student_profile).
    For student_profile: student_id required.
    """
    upload = request.FILES.get('file')
    if not upload:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    purpose = request.data.get('purpose', 'generic')
    bucket_type = request.data.get('bucket_type', 'media')
    tenant_code = request.data.get('tenant_code') or resolve_tenant_code(user=request.user)

    try:
        if purpose == 'student_profile':
            student_id = request.data.get('student_id')
            if not student_id:
                return Response({'error': 'student_id required'}, status=status.HTTP_400_BAD_REQUEST)
            student = get_object_or_404(Student, pk=student_id)
            denied = ensure_student_access(request.user, student)
            if denied:
                return denied
            service = get_media_service()
            profile_record, thumb_record = service.upload_student_profile(
                upload.file,
                upload.name,
                student=student,
                user=request.user,
            )
            student.profile_picture = profile_record.storage_key
            student.save(update_fields=['profile_picture'])
            return Response({
                'file_id': str(profile_record.id),
                'storage_key': profile_record.storage_key,
                'thumbnail_key': thumb_record.storage_key,
                'profile_picture': profile_record.storage_key,
            })

        service = StorageService(bucket_type=bucket_type)
        import uuid

        key = f'tenant/{tenant_code}/uploads/{uuid.uuid4().hex}_{upload.name}'
        record = service.upload(
            upload.file,
            upload.name,
            key,
            user=request.user,
            content_type=upload.content_type,
        )
        return Response({
            'file_id': str(record.id),
            'storage_key': record.storage_key,
            'size_bytes': record.size_bytes,
        })
    except ValidationError as exc:
        return Response({'error': exc.messages[0] if hasattr(exc, 'messages') else str(exc)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def signed_download_url(request, file_id):
    """Return expiring signed URL for a StoredFile (default 1 hour)."""
    stored = get_object_or_404(StoredFile, pk=file_id)
    if not can_access_file(request.user, stored):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    service = StorageService(bucket_type=stored.bucket_type)
    url = service.get_signed_download_url(stored.storage_key)
    log_file_download(request, stored)
    return Response({
        'url': url,
        'expires_in': int(request.query_params.get('expires_in', 3600)),
        'storage_key': stored.storage_key,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def signed_download_by_key(request):
    """GET ?storage_key=...&bucket_type=media"""
    storage_key = request.query_params.get('storage_key')
    if not storage_key:
        return Response({'error': 'storage_key required'}, status=400)
    stored = StoredFile.objects.filter(storage_key=storage_key).first()
    if stored and not can_access_file(request.user, stored):
        return Response({'error': 'Permission denied'}, status=403)
    bucket = request.query_params.get('bucket_type', stored.bucket_type if stored else 'media')
    service = StorageService(bucket_type=bucket)
    url = service.get_signed_download_url(storage_key)
    if stored:
        log_file_download(request, stored)
    return Response({'url': url})
