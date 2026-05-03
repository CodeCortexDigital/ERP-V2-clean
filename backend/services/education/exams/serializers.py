from rest_framework import serializers
from .models import *

class BaseModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaseModel
        fields = '__all__'
class SoftDeleteModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoftDeleteModel
        fields = '__all__'
class ExamTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamType
        fields = '__all__'
class ExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = '__all__'
class ExamRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamRegistration
        fields = '__all__'
class ExamResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamResult
        fields = '__all__'
class ExamScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSchedule
        fields = '__all__'
class ExamInvigilatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamInvigilator
        fields = '__all__'
class ExamMalpracticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamMalpractice
        fields = '__all__'

