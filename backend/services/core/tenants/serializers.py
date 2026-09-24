from rest_framework import serializers

from .models import School, TenantMembership


class SchoolSerializer(serializers.ModelSerializer):
    # Currency and language the whole app uses for this school.
    locale = serializers.SerializerMethodField()

    def get_locale(self, obj):
        from .localization import school_locale

        return school_locale(obj)

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
            'settings_json',
            'locale',
            'created_at',
        ]
        read_only_fields = ['id', 'school_id', 'created_at', 'locale']


class TenantMembershipSerializer(serializers.ModelSerializer):
    school = SchoolSerializer(read_only=True)
    school_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = TenantMembership
        fields = ['id', 'school', 'school_id', 'role', 'is_primary', 'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at']
