from rest_framework import serializers

from services.core.tenants.models import School

from .models import FeatureFlag


class FeatureFlagSerializer(serializers.ModelSerializer):
    tenant_code = serializers.CharField(source='tenant.tenant_code', read_only=True, allow_null=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True, allow_null=True)
    scope = serializers.SerializerMethodField()

    class Meta:
        model = FeatureFlag
        fields = (
            'id',
            'name',
            'is_enabled',
            'tenant',
            'tenant_code',
            'tenant_name',
            'scope',
            'rollout_percentage',
            'description',
            'updated_at',
        )
        read_only_fields = ('id', 'updated_at', 'tenant_code', 'tenant_name', 'scope')

    def get_scope(self, obj) -> str:
        return obj.tenant.tenant_code if obj.tenant_id else 'global'


class FeatureFlagUpsertSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=64)
    is_enabled = serializers.BooleanField(required=False)
    rollout_percentage = serializers.IntegerField(min_value=0, max_value=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    tenant_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_tenant_id(self, value):
        if value is None:
            return None
        if not School.objects.filter(pk=value, is_active=True).exists():
            raise serializers.ValidationError('Tenant not found.')
        return value
