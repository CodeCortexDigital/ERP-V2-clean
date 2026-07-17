from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import BehaviourRating, Skill, Observation
from .serializers import BehaviourRatingSerializer, SkillSerializer, ObservationSerializer


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    
    def get_queryset(self):
        queryset = Skill.objects.all()
        domain = self.request.query_params.get('domain')
        if domain:
            queryset = queryset.filter(domain=domain)
        return queryset


class BehaviourRatingViewSet(viewsets.ModelViewSet):
    queryset = BehaviourRating.objects.all()
    serializer_class = BehaviourRatingSerializer
    
    def get_queryset(self):
        queryset = BehaviourRating.objects.select_related('student', 'class_ref', 'teacher').all()
        
        student_id = self.request.query_params.get('student_id')
        class_id = self.request.query_params.get('class_id')
        domain = self.request.query_params.get('domain')
        term = self.request.query_params.get('term')
        academic_year = self.request.query_params.get('academic_year')
        
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        if domain:
            queryset = queryset.filter(domain=domain)
        if term:
            queryset = queryset.filter(term=term)
        if academic_year:
            queryset = queryset.filter(academic_year=academic_year)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Bulk create/update ratings for multiple students"""
        ratings_data = request.data.get('ratings', [])
        created = []
        updated = []
        
        for item in ratings_data:
            student_id = item.get('student')
            class_id = item.get('class_ref')
            domain = item.get('domain', 'affective')
            term = item.get('term', 'first')
            academic_year = item.get('academic_year', '2026-2027')
            ratings = item.get('ratings', {})
            
            obj, was_created = BehaviourRating.objects.update_or_create(
                student_id=student_id,
                class_ref_id=class_id,
                domain=domain,
                term=term,
                academic_year=academic_year,
                defaults={
                    'teacher_id': item.get('teacher'),
                    'ratings': ratings,
                    'comments': item.get('comments', ''),
                }
            )
            
            if was_created:
                created.append(obj.id)
            else:
                updated.append(obj.id)
        
        return Response({
            'created': len(created),
            'updated': len(updated),
            'created_ids': created,
            'updated_ids': updated,
        })


class ObservationViewSet(viewsets.ModelViewSet):
    queryset = Observation.objects.all()
    serializer_class = ObservationSerializer
    
    def get_queryset(self):
        queryset = Observation.objects.select_related('student', 'class_ref', 'teacher').all()
        
        observation_type = self.request.query_params.get('type')
        student_id = self.request.query_params.get('student_id')
        class_id = self.request.query_params.get('class_id')
        severity = self.request.query_params.get('severity')
        
        if observation_type:
            queryset = queryset.filter(observation_type=observation_type)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        if severity:
            queryset = queryset.filter(severity=severity)
        
        return queryset
