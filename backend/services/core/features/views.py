from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from services.core.accounts.permissions import IsPlatformOwner
from rest_framework.response import Response

from services.core.tenants.models import School
from services.core.tenants.serializers import SchoolSerializer

from .models import FeatureFlag
from .serializers import FeatureFlagSerializer, FeatureFlagUpsertSerializer
from .services import invalidate_feature_cache, resolve_all_features


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def feature_availability(request):
    """Resolved on/off map for the current tenant and user."""
    tenant = getattr(request, 'tenant', None)
    flags = resolve_all_features(tenant=tenant, user=request.user)
    return Response({'flags': flags})


@api_view(['GET'])
@permission_classes([IsPlatformOwner])
def feature_flag_list(request):
    """All flag rows (global + overrides) for admin UI."""
    tenant_id = request.query_params.get('tenant_id')
    qs = FeatureFlag.objects.select_related('tenant').order_by('name', 'tenant_id')
    if tenant_id:
        qs = qs.filter(Q(tenant_id=tenant_id) | Q(tenant__isnull=True))
    return Response({
        'flags': FeatureFlagSerializer(qs, many=True).data,
        'tenants': SchoolSerializer(School.objects.filter(is_active=True), many=True).data,
    })


@api_view(['PATCH'])
@permission_classes([IsPlatformOwner])
def feature_flag_update(request, pk):
    flag = FeatureFlag.objects.filter(pk=pk).first()
    if not flag:
        return Response({'error': 'Feature flag not found'}, status=status.HTTP_404_NOT_FOUND)

    for field in ('is_enabled', 'rollout_percentage', 'description'):
        if field in request.data:
            setattr(flag, field, request.data[field])
    flag.save()
    invalidate_feature_cache(flag.tenant_id)
    return Response(FeatureFlagSerializer(flag).data)


@api_view(['POST'])
@permission_classes([IsPlatformOwner])
def feature_flag_upsert(request):
    """Create or update global or per-tenant override."""
    ser = FeatureFlagUpsertSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    data = ser.validated_data
    tenant = None
    tenant_id = data.get('tenant_id')
    if tenant_id:
        tenant = School.objects.filter(pk=tenant_id).first()

    flag, _created = FeatureFlag.objects.get_or_create(
        name=data['name'],
        tenant=tenant,
        defaults={
            'is_enabled': data.get('is_enabled', False),
            'rollout_percentage': data.get('rollout_percentage', 100),
            'description': data.get('description', ''),
        },
    )
    if 'is_enabled' in data:
        flag.is_enabled = data['is_enabled']
    if 'rollout_percentage' in data:
        flag.rollout_percentage = data['rollout_percentage']
    if 'description' in data:
        flag.description = data['description']
    flag.save()
    invalidate_feature_cache(tenant_id)
    return Response(FeatureFlagSerializer(flag).data, status=status.HTTP_200_OK)
