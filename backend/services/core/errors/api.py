"""Error tracking (P4): browsers report their errors; the platform owner sees and resolves groups. /api/v1/errors/"""
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from services.core.accounts.permissions import IsPlatformOwner

from . import capture
from .models import ErrorGroup

CLIENT_LIMIT = 60  # reports per IP address per hour


@api_view(['POST'])
@permission_classes([AllowAny])
def client_error(request):
    """The browser reports an error (signed in or not). Limited, and only the fields we need are kept."""
    from services.core.security.policy import client_ip

    key = f'client-errors:{client_ip(request) or "unknown"}'
    n = cache.get(key, 0)
    if n >= CLIENT_LIMIT:
        return Response(status=status.HTTP_204_NO_CONTENT)
    cache.set(key, n + 1, 3600)
    d = request.data or {}
    message = str(d.get('message') or '').strip()
    if not message:
        return Response({'error': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)
    stack = str(d.get('stack') or '')
    first = next((ln.strip() for ln in stack.splitlines()[1:] if ln.strip()), '')
    capture.record(source='frontend', kind=str(d.get('kind') or 'Error')[:120], message=message[:500],
                   location=str(d.get('component') or first)[:300], stack=stack, path=str(d.get('url') or '')[:300],
                   user=request.user, school=getattr(request, 'tenant', None), extra={'browser': str(request.headers.get('User-Agent', ''))[:200]})
    return Response(status=status.HTTP_204_NO_CONTENT)


def _group(g, samples=False):
    out = {'id': str(g.id), 'source': g.source, 'kind': g.kind, 'message': g.message, 'location': g.location, 'count': g.count,
           'status': g.status, 'first_seen': timezone.localtime(g.first_seen).isoformat(), 'last_seen': timezone.localtime(g.last_seen).isoformat(),
           'last_school': g.last_school, 'last_user': g.last_user, 'last_path': g.last_path, 'release': g.release}
    if samples:
        out['samples'] = g.samples
    return out


@api_view(['GET'])
@permission_classes([IsPlatformOwner])
def groups(request):
    qs = ErrorGroup.objects.all()
    state = request.GET.get('status', 'open')
    if state in ('open', 'resolved', 'ignored'):
        qs = qs.filter(status=state)
    day = timezone.now() - timezone.timedelta(days=1)
    return Response({'groups': [_group(g) for g in qs[:200]],
                     'open': ErrorGroup.objects.filter(status='open').count(),
                     'last_day': ErrorGroup.objects.filter(last_seen__gte=day, status='open').count(),
                     'release': capture.release()})


@api_view(['GET', 'POST'])
@permission_classes([IsPlatformOwner])
def group(request, group_id):
    g = get_object_or_404(ErrorGroup, pk=group_id)
    if request.method == 'POST':
        new = (request.data or {}).get('status')
        if new not in ('open', 'resolved', 'ignored'):
            return Response({'error': 'status must be open, resolved or ignored'}, status=status.HTTP_400_BAD_REQUEST)
        g.status = new
        g.save(update_fields=['status'])
    return Response({'group': _group(g, samples=True)})
