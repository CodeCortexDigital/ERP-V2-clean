"""
API v1 views — versioned serializers on top of existing student endpoints.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.versioning import VersionedViewMixin, get_serializer_class
from api.v1.serializers import StudentSerializerV1
from services.core.accounts.decorators import ensure_student_access
from services.education.students.models import Student
from services.education.students.views import (
    StudentDetailView as _StudentDetailView,
    StudentListCreateView as _StudentListCreateView,
    force_update_activity,
    student_360,
    update_student_activity,
)


class StudentListCreateView(VersionedViewMixin, _StudentListCreateView):
    serializer_class = StudentSerializerV1
    serializer_classes_by_version = {'v1': StudentSerializerV1}


class StudentDetailView(VersionedViewMixin, _StudentDetailView):
    serializer_class = StudentSerializerV1
    serializer_classes_by_version = {'v1': StudentSerializerV1}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_by_id(request, student_id):
    try:
        student = Student.objects.select_related('current_class', 'current_section', 'tenant').get(
            student_id=student_id,
        )
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
    denied = ensure_student_access(request.user, student)
    if denied:
        return denied
    ser_cls = get_serializer_class('students', getattr(request, 'version', 'v1'))
    return Response(ser_cls(student).data)


__all__ = [
    'StudentListCreateView',
    'StudentDetailView',
    'get_student_by_id',
    'student_360',
    'update_student_activity',
    'force_update_activity',
]
