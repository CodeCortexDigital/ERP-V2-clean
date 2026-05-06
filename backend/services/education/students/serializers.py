from rest_framework import serializers
from .models import Student

class StudentSerializer(serializers.ModelSerializer):
    current_class_name = serializers.SerializerMethodField()
    current_section_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = '__all__'
    
    def get_current_class_name(self, obj):
        return obj.current_class.name if obj.current_class else None
    
    def get_current_section_name(self, obj):
        return obj.current_section.name if obj.current_section else None
