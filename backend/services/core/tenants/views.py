from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import School, TenantMembership
from .serializers import SchoolSerializer, TenantMembershipSerializer
from .utils import set_session_tenant, user_can_access_tenant


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_tenant(request):
    tenant = getattr(request, 'tenant', None)
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
