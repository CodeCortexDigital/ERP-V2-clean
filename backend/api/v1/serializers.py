"""
API v1 serializers — frozen field set; deprecated fields retained for compatibility.
"""

from rest_framework import serializers

from services.education.students.models import Student


class StudentSerializerV1(serializers.ModelSerializer):
    """
    v1 student contract. Fields are only added in newer versions, never removed.
    """

    class_name = serializers.CharField(
        source='current_class.name',
        read_only=True,
        help_text='DEPRECATED: use current_class_name in API v2.',
    )
    section_name = serializers.CharField(
        source='current_section.name',
        read_only=True,
        help_text='DEPRECATED: use current_section_name in API v2.',
    )

    class Meta:
        model = Student
        fields = [
            'id',
            'student_id',
            'full_name',
            'email',
            'phone',
            'date_of_birth',
            'admission_date',
            'gender',
            'guardian_name',
            'emergency_contact',
            'father_name',
            'mother_name',
            'guardian_phone',
            'address',
            'city',
            'state',
            'postal_code',
            'current_class',
            'current_section',
            'class_name',
            'section_name',
            'is_active',
            'last_activity',
            'profile_picture',
            'tenant',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'class_name', 'section_name')
        extra_kwargs = {
            'date_of_birth': {'required': False, 'allow_null': True},
            'admission_date': {'required': False, 'allow_null': True},
            'class_name': {'read_only': True},
            'section_name': {'read_only': True},
        }

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if data.get('date_of_birth') == '':
            data['date_of_birth'] = None
        if data.get('admission_date') == '':
            data['admission_date'] = None
        return super().to_internal_value(data)
