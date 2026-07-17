from rest_framework import serializers
from .models import BehaviourRating, Skill, Observation


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = '__all__'


class BehaviourRatingSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True, default='')
    
    class Meta:
        model = BehaviourRating
        fields = '__all__'


class ObservationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True, default='')
    class_name = serializers.CharField(source='class_ref.name', read_only=True, default='')
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True, default='')
    
    class Meta:
        model = Observation
        fields = '__all__'
