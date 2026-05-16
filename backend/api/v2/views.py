"""
API v2 views — same behavior as v1 with extended student serializers.
"""

from api.versioning import VersionedViewMixin
from api.v2.serializers import StudentSerializerV2
from api.v1.views import (
    force_update_activity,
    get_student_by_id,
    student_360,
    update_student_activity,
)
from services.education.students.views import (
    StudentDetailView as _StudentDetailView,
    StudentListCreateView as _StudentListCreateView,
)


class StudentListCreateView(VersionedViewMixin, _StudentListCreateView):
    serializer_class = StudentSerializerV2
    serializer_classes_by_version = {'v2': StudentSerializerV2}


class StudentDetailView(VersionedViewMixin, _StudentDetailView):
    serializer_class = StudentSerializerV2
    serializer_classes_by_version = {'v2': StudentSerializerV2}


__all__ = [
    'StudentListCreateView',
    'StudentDetailView',
    'get_student_by_id',
    'student_360',
    'update_student_activity',
    'force_update_activity',
]
