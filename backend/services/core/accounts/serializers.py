from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'password']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

# ============================================================
# STUDENT SERIALIZER
# ============================================================
from rest_framework import serializers
from django.apps import apps

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = apps.get_model('education_students', 'Student')
        fields = [
            'id', 'student_id', 'full_name', 'email', 'phone', 
            'father_name', 'mother_name', 'guardian_phone', 
            'enrollment_date', 'program', 'current_semester',
            'current_class', 'current_section', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
