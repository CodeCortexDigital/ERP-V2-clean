"""Platform owner console: every school on this installation (superusers only)."""
from django.apps import apps
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .context import use_tenant
from .models import School, TenantMembership


def _owner_only(request):
    if not request.user.is_superuser:
        return Response({'error': 'Only the platform owner can view all schools.'}, status=status.HTTP_403_FORBIDDEN)
    return None


def _counts(model_label):
    """{school_id: active row count} across all schools (base manager: no school filter)."""
    Model = apps.get_model(model_label)
    filters = Q(is_active=True) if any(f.name == 'is_active' for f in Model._meta.fields) else Q()
    rows = Model._base_manager.filter(filters, tenant__isnull=False).values('tenant').annotate(n=Count('pk'))
    return {r['tenant']: r['n'] for r in rows}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def platform_schools(request):
    denied = _owner_only(request)
    if denied:
        return denied
    with use_tenant(None):
        students = _counts('education_students.Student')
        staff = _counts('education_academics.Teacher')
        admins = {}
        for m in TenantMembership.objects.filter(role='admin', is_active=True).select_related('user'):
            admins.setdefault(m.school_id, []).append(m.user.email)
        schools = [
            {
                'id': str(s.pk),
                'name': s.name,
                'code': s.tenant_code,
                'school_id': s.school_id,
                'city': (s.settings_json or {}).get('city', ''),
                'is_active': s.is_active,
                'created_at': s.created_at,
                'students': students.get(s.pk, 0),
                'staff': staff.get(s.pk, 0),
                'admins': admins.get(s.pk, []),
                'signup': ((s.settings_json or {}).get('onboarding') or {}).get('created_via', 'setup'),
            }
            for s in School.objects.order_by('-created_at')
        ]
    return Response({
        'schools': schools,
        'totals': {
            'schools': len(schools),
            'active': sum(1 for s in schools if s['is_active']),
            'students': sum(s['students'] for s in schools),
            'staff': sum(s['staff'] for s in schools),
        },
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def platform_school_status(request, pk):
    """Suspend or re-activate a school: {"is_active": false}. Suspended schools can't sign in."""
    denied = _owner_only(request)
    if denied:
        return denied
    school = get_object_or_404(School, pk=pk)
    school.is_active = bool(request.data.get('is_active'))
    school.save(update_fields=['is_active', 'updated_at'])
    return Response({'id': str(school.pk), 'is_active': school.is_active})
