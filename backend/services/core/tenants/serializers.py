from rest_framework import serializers

from .models import School, TenantMembership


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = [
            'id',
            'tenant_code',
            'school_id',
            'name',
            'subdomain',
            'email_domain',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'school_id', 'created_at']


class TenantMembershipSerializer(serializers.ModelSerializer):
    school = SchoolSerializer(read_only=True)
    school_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = TenantMembership
        fields = ['id', 'school', 'school_id', 'role', 'is_primary', 'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at']
