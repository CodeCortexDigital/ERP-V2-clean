from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from services.core.accounts.decorators import filter_students_for_user, get_user_role
from .models import BehaviourRating, Skill, Observation
from .serializers import BehaviourRatingSerializer, SkillSerializer, ObservationSerializer


class StaffWritesFamiliesRead(permissions.BasePermission):
    """Everyone signed in can read (families only their own children); only staff can change anything."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.method in permissions.SAFE_METHODS or get_user_role(request.user) in ('admin', 'teacher')


def _for_family(request, queryset, field='student'):
    if get_user_role(request.user) in ('parent', 'student'):
        from services.education.students.models import Student

        kids = filter_students_for_user(request.user, Student.objects.all())
        return queryset.filter(**{f'{field}__in': kids})
    return queryset


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [StaffWritesFamiliesRead]
    
    def get_queryset(self):
        queryset = Skill.objects.all()
        domain = self.request.query_params.get('domain')
        if domain:
            queryset = queryset.filter(domain=domain)
        return queryset


class BehaviourRatingViewSet(viewsets.ModelViewSet):
    queryset = BehaviourRating.objects.all()
    serializer_class = BehaviourRatingSerializer
    permission_classes = [StaffWritesFamiliesRead]
    
    def get_queryset(self):
        queryset = _for_family(self.request, BehaviourRating.objects.select_related('student', 'class_ref', 'teacher').all())
        
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
    permission_classes = [StaffWritesFamiliesRead]
    
    def get_queryset(self):
        queryset = _for_family(self.request, Observation.objects.select_related('student', 'class_ref', 'teacher').all())
        
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
