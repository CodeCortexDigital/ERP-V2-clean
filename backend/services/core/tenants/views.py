from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import School, TenantMembership
from .serializers import SchoolSerializer, TenantMembershipSerializer
from .utils import resolve_tenant_for_user, set_session_tenant, user_can_access_tenant


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_tenant(request):
    # JWT requests usually have no session tenant yet, so use the user's own
    # (primary) school before falling back to the first active school, which
    # keeps institute name/tagline available to dashboards.
    tenant = getattr(request, 'tenant', None) or resolve_tenant_for_user(request.user)
    if not tenant and request.user.is_superuser:
        tenant = School.objects.filter(is_active=True).first()
    if not tenant:
        return Response({'tenant': None})
    return Response({'tenant': SchoolSerializer(tenant).data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_tenants(request):
    if request.user.is_superuser:
        schools = School.objects.filter(is_active=True)
        data = SchoolSerializer(schools, many=True).data
        return Response({'tenants': data, 'memberships': []})

    memberships = (
        TenantMembership.objects.filter(user=request.user, is_active=True)
        .select_related('school')
    )
    return Response({
        'tenants': SchoolSerializer([m.school for m in memberships], many=True).data,
        'memberships': TenantMembershipSerializer(memberships, many=True).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def switch_tenant(request):
    """POST tenant_code, school_id, or tenant_id to set session active_tenant_id."""
    tenant_code = request.data.get('tenant_code')
    school_id = request.data.get('school_id')
    tenant_id = request.data.get('tenant_id')

    school = None
    if tenant_id:
        school = School.objects.filter(pk=tenant_id, is_active=True).first()
    elif tenant_code:
        school = School.objects.filter(tenant_code=str(tenant_code).upper(), is_active=True).first()
    elif school_id:
        school = School.objects.filter(school_id__iexact=school_id, is_active=True).first()

    if not school:
        return Response({'error': 'School tenant not found'}, status=status.HTTP_404_NOT_FOUND)

    if not request.user.is_superuser and not user_can_access_tenant(request.user, school):
        return Response({'error': 'Permission denied for this tenant'}, status=status.HTTP_403_FORBIDDEN)

    set_session_tenant(request, school)
    from .context import set_current_tenant
    request.tenant = school
    set_current_tenant(school)

    return Response({
        'message': f'Switched to {school.name}',
        'tenant': SchoolSerializer(school).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_school(request):
    """Superuser/staff: register a new school tenant."""
    if not request.user.is_superuser:
        return Response({'error': 'Only superusers can create schools'}, status=403)

    serializer = SchoolSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    school = serializer.save()
    return Response(SchoolSerializer(school).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def tenant_settings(request):
    """GET or update institutional parameters, fee particulars, bank accounts, rules, and grading for active tenant."""
    try:
        # Same resolution as current_tenant, so reads and saves hit the user's school.
        tenant = getattr(request, 'tenant', None) or resolve_tenant_for_user(request.user)
        if not tenant and request.user.is_superuser:
            tenant = School.objects.filter(is_active=True).first()

        if request.method == 'GET':
            if tenant and hasattr(tenant, 'settings_json'):
                return Response(tenant.settings_json or {})
            return Response({})

        # PUT / PATCH update settings_json
        if tenant and hasattr(tenant, 'settings_json'):
            current_settings = tenant.settings_json or {}
            updated_data = request.data
            if isinstance(updated_data, dict):
                current_settings.update(updated_data)
                tenant.settings_json = current_settings
                tenant.save(update_fields=['settings_json'])
            return Response(tenant.settings_json)
        return Response(request.data if isinstance(request.data, dict) else {})
    except Exception as e:
        return Response({'profile': {}, 'feeParticulars': {}, 'banks': [], 'rules': '', 'grading': []})


