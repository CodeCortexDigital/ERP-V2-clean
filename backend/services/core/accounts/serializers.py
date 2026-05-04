from rest_framework import serializers
from django.apps import apps

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = apps.get_model('core_accounts', 'User')
        fields = ['id', 'email', 'full_name', 'is_staff', 'is_superuser']


# ============================================================
# STUDENT SERIALIZER
# ============================================================
class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = apps.get_model('education_students', 'Student')
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'deleted_at']
        extra_kwargs = {
            'phone': {'required': False, 'allow_blank': True},
            'father_name': {'required': False, 'allow_blank': True},
            'mother_name': {'required': False, 'allow_blank': True},
            'guardian_phone': {'required': False, 'allow_blank': True},
            'guardian_email': {'required': False, 'allow_blank': True},
            'program': {'required': False, 'allow_blank': True},
            'enrollment_date': {'required': False, 'allow_null': True},
            'current_class': {'required': False, 'allow_null': True},
            'current_section': {'required': False, 'allow_null': True},
            'student_id': {'required': False, 'allow_blank': True},
            'full_name': {'required': True},
            'email': {'required': False, 'allow_blank': True},
        }
    
    def validate_email(self, value):
        """Validate email uniqueness, but allow blank during updates"""
        if not value:
            return value
        # Check if email exists for another student
        if self.instance:
            # During update, exclude current instance
            if apps.get_model('education_students', 'Student').objects.filter(email=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("A student with this email already exists.")
        else:
            # During create, check if email exists
            if apps.get_model('education_students', 'Student').objects.filter(email=value).exists():
                raise serializers.ValidationError("A student with this email already exists.")
        return value
    
    def validate_full_name(self, value):
        if not value:
            raise serializers.ValidationError("Full name is required.")
        return value

# ============================================================
# CLASS SERIALIZER
# ============================================================
class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = apps.get_model('education_academics', 'SchoolClass')
        fields = ['id', 'name', 'code', 'capacity', 'is_active']
