"""Backups for the platform owner (P2). /api/v1/backups/"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from services.core.accounts.permissions import IsPlatformOwner

from . import portable
from .models import BackupLog


def _row(log):
    n = portable.notes(log)
    test = n.get('restore_test') or {}
    return {'id': str(log.id), 'status': log.status, 'started_at': timezone.localtime(log.started_at).isoformat(),
            'size': log.size_bytes, 'records': n.get('records'), 'kinds': n.get('kinds'), 'durable': n.get('durable'),
            'path': log.backup_path, 'error': log.error_message, 'verified': log.verified,
            'verified_at': timezone.localtime(log.verified_at).isoformat() if log.verified_at else None,
            'restore_test': {'ok': test.get('ok'), 'missing': test.get('missing'), 'running': test.get('running', False),
                             'error': test.get('error')} if test else None,
            'expires_at': timezone.localtime(log.expires_at).isoformat(), 'removed': log.cleanup_completed}


@api_view(['GET', 'POST'])
@permission_classes([IsPlatformOwner])
def backups(request):
    if request.method == 'POST':
        log = portable.create(note=f'manual by {request.user.email}')
        if log.status != 'success':
            return Response({'error': f'Backup failed: {log.error_message[:300]}', 'backup': _row(log)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'backup': _row(log)}, status=status.HTTP_201_CREATED)
    rows = BackupLog.objects.filter(backup_type='database').order_by('-started_at')[:60]
    last_ok = next((r for r in rows if r.status == 'success' and not r.cleanup_completed), None)
    age_h = round((timezone.now() - last_ok.started_at).total_seconds() / 3600, 1) if last_ok else None
    return Response({'backups': [_row(r) for r in rows], 'durable': portable.durable(), 'last_backup_hours_ago': age_h,
                     'last_verified': next((_row(r)['verified_at'] for r in rows if r.verified), None)})


@api_view(['POST'])
@permission_classes([IsPlatformOwner])
def verify(request, backup_id):
    """The restore test takes minutes, so it runs in the background; the page checks back for the result."""
    log = get_object_or_404(BackupLog, pk=backup_id, status='success', cleanup_completed=False)
    n = portable.notes(log)
    n['restore_test'] = {'running': True, 'started': timezone.now().isoformat()}
    log.metadata = n
    log.save(update_fields=['metadata'])

    def run(log_id):
        from django.db import connection

        entry = BackupLog.objects.get(pk=log_id)
        try:
            portable.verify(entry)
        except Exception as exc:
            info = portable.notes(entry)
            info['restore_test'] = {'ok': False, 'error': str(exc)[:500], 'at': timezone.now().isoformat()}
            entry.metadata, entry.verified = info, False
            entry.save(update_fields=['metadata', 'verified'])
        finally:
            connection.close()

    import threading

    threading.Thread(target=run, args=(log.pk,), daemon=True).start()
    return Response({'message': 'Restore test started. It takes a few minutes; this page updates when it is done.', 'backup': _row(log)},
                    status=status.HTTP_202_ACCEPTED)
