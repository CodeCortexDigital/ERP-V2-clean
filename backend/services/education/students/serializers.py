from rest_framework import serializers
from .models import Student

class StudentSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='current_class.name', read_only=True)
    section_name = serializers.CharField(source='current_section.name', read_only=True)
    
    class Meta:
        model = Student
        fields = '__all__'
        extra_kwargs = {
            'date_of_birth': {'required': False, 'allow_null': True},
            'admission_date': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        # Handle empty date strings
        if data.get('date_of_birth') == '':
            data['date_of_birth'] = None
        if data.get('admission_date') == '':
            data['admission_date'] = None
        return super().to_internal_value(data)
