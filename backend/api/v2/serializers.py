"""
API v2 serializers — v1 fields preserved; new additive fields only.
"""

from rest_framework import serializers

from api.v1.serializers import StudentSerializerV1
from services.education.students.models import Student


class StudentSerializerV2(StudentSerializerV1):
    """
    v2 extends v1: new fields only. Deprecated v1 aliases remain populated.
    """

    display_label = serializers.CharField(read_only=True)
    tenant_code = serializers.SerializerMethodField()
    current_class_name = serializers.CharField(
        source='current_class.name',
        read_only=True,
        help_text='Canonical class name (replaces deprecated class_name).',
    )
    current_section_name = serializers.CharField(
        source='current_section.name',
        read_only=True,
        help_text='Canonical section name (replaces deprecated section_name).',
    )
    enrollment_status = serializers.SerializerMethodField(
        help_text='Derived status: active | inactive.',
    )
    api_version = serializers.SerializerMethodField()

    class Meta(StudentSerializerV1.Meta):
        fields = StudentSerializerV1.Meta.fields + [
            'display_label',
            'tenant_code',
            'current_class_name',
            'current_section_name',
            'enrollment_status',
            'api_version',
        ]
        read_only_fields = StudentSerializerV1.Meta.read_only_fields + (
            'display_label',
            'tenant_code',
            'current_class_name',
            'current_section_name',
            'enrollment_status',
            'api_version',
        )

    def get_tenant_code(self, obj: Student) -> str | None:
        if obj.tenant_id and obj.tenant:
            return obj.tenant.tenant_code
        return None

    def get_enrollment_status(self, obj: Student) -> str:
        return 'active' if obj.is_active else 'inactive'

    def get_api_version(self, obj: Student) -> str:
        return '2.0'
