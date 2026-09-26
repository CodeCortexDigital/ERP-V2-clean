"""School data export and end-of-contract deletion (P13). /api/v1/portability/"""
from __future__ import annotations

from datetime import timedelta

from django.core.files.base import ContentFile
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import is_admin
from services.core.accounts.permissions import IsPlatformOwner
from services.core.tenants.models import School

from . import data
from .models import SchoolDeletion, SchoolExport

EXPORT_DAYS = 7
GRACE_DAYS = 30


def _local(dt):
    return timezone.localtime(dt).isoformat() if dt else None


def _export(e):
    return {'id': str(e.id), 'format': e.format, 'format_label': e.get_format_display(), 'status': e.status, 'size': e.size,
            'records': sum(e.counts.get('records', {}).values()) if isinstance(e.counts.get('records'), dict) else 0,
            'people': e.counts.get('people', 0), 'files': e.counts.get('files_included', e.counts.get('files', 0)),
            'created_at': _local(e.created_at), 'expires_at': _local(e.expires_at), 'error': e.error,
            'by': (getattr(e.created_by, 'full_name', '') or getattr(e.created_by, 'email', '')) if e.created_by else ''}


def _deletion(d):
    if d is None:
        return None
    return {'id': str(d.id), 'status': d.status, 'status_label': d.get_status_display(), 'school': d.school_name, 'code': d.school_code,
            'requested_at': _local(d.requested_at), 'scheduled_for': _local(d.scheduled_for), 'reason': d.reason,
            'requested_by': d.requested_by_email, 'cancelled_at': _local(d.cancelled_at),
            'completed_at': _local(d.completed_at), 'completed_by': d.completed_by, 'counts': d.counts, 'files_deleted': d.files_deleted,
            'users_deleted': d.users_deleted, 'records_deleted': sum(d.counts.values()), 'last_export_at': _local(d.last_export_at)}


def _school(request):
    if not is_admin(request.user):
        return None, Response({'error': 'Only school administrators can do this.'}, status=status.HTTP_403_FORBIDDEN)
    school = getattr(request, 'tenant', None)
    if school is None:
        return None, Response({'error': 'Pick a school first.'}, status=status.HTTP_400_BAD_REQUEST)
    return school, None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview(request):
    school, error = _school(request)
    if error:
        return error
    SchoolExport.objects.filter(school=school, status='ready', expires_at__lt=timezone.now()).update(status='expired')
    pending = SchoolDeletion.objects.filter(school=school, status='scheduled').first()
    return Response({'exports': [_export(e) for e in SchoolExport.objects.filter(school=school).select_related('created_by')[:20]],
                     'deletion': _deletion(pending), 'formats': dict(SchoolExport.FORMATS), 'grace_days': GRACE_DAYS,
                     'school_name': school.name})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_export(request):
    school, error = _school(request)
    if error:
        return error
    fmt = (request.data or {}).get('format', 'csv')
    if fmt not in dict(SchoolExport.FORMATS):
        return Response({'error': 'Choose CSV, JSON or Excel.'}, status=status.HTTP_400_BAD_REQUEST)
    now = timezone.now()
    try:
        content, name, manifest = data.build(school, fmt)
    except Exception as exc:  # recorded so the office can see it failed
        e = SchoolExport.objects.create(school=school, format=fmt, status='failed', error=str(exc)[:300], created_by=request.user,
                                        expires_at=now)
        return Response({'error': 'The export could not be made. Please try again or contact support.', 'export': _export(e)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    e = SchoolExport(school=school, format=fmt, created_by=request.user, size=len(content), counts=manifest,
                     expires_at=now + timedelta(days=EXPORT_DAYS))
    e.file.save(name, ContentFile(content), save=False)
    e.save()
    SchoolDeletion.objects.filter(school=school, status='scheduled').update(last_export_at=now)
    return Response({'export': _export(e)}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download(request, export_id):
    e = get_object_or_404(SchoolExport, pk=export_id)
    mine = is_admin(request.user) and e.school_id == getattr(getattr(request, 'tenant', None), 'pk', None)
    if not (mine or request.user.is_superuser):
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if e.status != 'ready' or e.expires_at < timezone.now() or not e.file:
        return Response({'error': 'This export has expired. Make a new one.'}, status=status.HTTP_410_GONE)
    return FileResponse(e.file.open('rb'), as_attachment=True, filename=e.file.name.rsplit('/', 1)[-1])


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def deletion(request):
    """POST {confirm: <school name>, reason}: delete the school's data in 30 days. DELETE: cancel."""
    school, error = _school(request)
    if error:
        return error
    pending = SchoolDeletion.objects.filter(school=school, status='scheduled').first()
    if request.method == 'DELETE':
        if pending is None:
            return Response({'error': 'Nothing is scheduled.'}, status=status.HTTP_400_BAD_REQUEST)
        pending.status, pending.cancelled_at = 'cancelled', timezone.now()
        pending.save(update_fields=['status', 'cancelled_at'])
        return Response({'message': 'The deletion is cancelled. Nothing will be deleted.', 'deletion': None})
    if pending is not None:
        return Response({'error': 'A deletion is already scheduled.', 'deletion': _deletion(pending)}, status=status.HTTP_400_BAD_REQUEST)
    if ((request.data or {}).get('confirm') or '').strip().lower() != school.name.strip().lower():
        return Response({'error': f'Type the school name exactly ("{school.name}") to confirm.'}, status=status.HTTP_400_BAD_REQUEST)
    last = SchoolExport.objects.filter(school=school, status='ready').first()
    d = SchoolDeletion.objects.create(school=school, school_name=school.name, school_code=school.tenant_code, requested_by=request.user,
                                      requested_by_email=request.user.email,
                                      scheduled_for=timezone.now() + timedelta(days=GRACE_DAYS), reason=str(request.data.get('reason') or '')[:300],
                                      last_export_at=last.created_at if last else None)
    when = timezone.localtime(d.scheduled_for)
    return Response({'message': f'All of the school\'s data will be deleted on {when:%d %b %Y}. You can cancel until then. '
                                'Download an export first if you want to keep a copy.', 'deletion': _deletion(d)},
                    status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def certificate(request, deletion_id):
    d = get_object_or_404(SchoolDeletion, pk=deletion_id)
    if not request.user.is_superuser:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'deletion': _deletion(d)})


# ---- Platform owner ---------------------------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsPlatformOwner])
def platform_list(request):
    return Response({'deletions': [_deletion(d) for d in SchoolDeletion.objects.all()[:200]]})


@api_view(['POST'])
@permission_classes([IsPlatformOwner])
def platform_purge(request, deletion_id):
    """Carry out a scheduled deletion now (after the school's confirmation), typing the school name again."""
    d = get_object_or_404(SchoolDeletion, pk=deletion_id, status='scheduled')
    if ((request.data or {}).get('confirm') or '').strip().lower() != d.school_name.strip().lower():
        return Response({'error': f'Type the school name exactly ("{d.school_name}") to confirm.'}, status=status.HTTP_400_BAD_REQUEST)
    data.purge(d.school, d, by=request.user.email)
    return Response({'deletion': _deletion(d)})


def run_due(now=None):
    """Daily: carry out deletions whose date has come, and expire old exports (removing their files)."""
    now = now or timezone.now()
    done = 0
    for d in SchoolDeletion.objects.filter(status='scheduled', scheduled_for__lte=now).select_related('school'):
        data.purge(d.school, d, by='daily job')
        done += 1
    expired = 0
    for e in SchoolExport.objects.filter(status='ready', expires_at__lt=now):
        if e.file:
            e.file.delete(save=False)
        e.status = 'expired'
        e.save(update_fields=['status', 'file'])
        expired += 1
    return {'deleted_schools': done, 'expired_exports': expired}
