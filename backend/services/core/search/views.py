from django.core.paginator import Paginator
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Value, Q
from django.db import DatabaseError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)

import re
import html

from services.education.students.models import Student
from services.education.academics.models import SchoolClass, Teacher, TeacherSubjectAssignment


def _highlight(text: str, query: str) -> str:
    """Simple case-insensitive highlight that escapes HTML and wraps matches in <mark>."""
    if not text:
        return ''
    escaped = html.escape(text)
    try:
        pattern = re.compile(re.escape(query), re.IGNORECASE)
        return pattern.sub(lambda m: f"<mark>{m.group(0)}</mark>", escaped)
    except re.error:
        return escaped


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search(request):
    """Search students, teachers and classes using pg_trgm trigram similarity.

    Query params: `q`, `page`, `page_size`.
    Returns paginated JSON: { results: [...], count }
    Each result: { type: 'student'|'teacher'|'class', id, label, subLabel }
    """
    try:
        q = (request.GET.get('q') or '').strip()
        page = int(request.GET.get('page') or 1)
        page_size = int(request.GET.get('page_size') or 10)

        if not q:
            return Response({'success': True, 'data': {'results': [], 'count': 0}})

        # Try TrigramSimilarity (Postgres + pg_trgm). If unavailable, fall back to icontains.
        try:
            # Subquery for teachers assigned to subjects matching the query
            matching_teacher_ids = TeacherSubjectAssignment.objects.filter(
                class_subject__subject__name__icontains=q
            ).values_list('teacher_id', flat=True)

            student_qs = (
                Student.objects.annotate(similarity=TrigramSimilarity('full_name', q))
                .filter(
                    Q(similarity__gt=0.1) |
                    Q(student_id__icontains=q) |
                    Q(father_name__icontains=q) |
                    Q(phone__icontains=q)
                )
                .order_by('-similarity')[:100]
            )

            teacher_qs = (
                Teacher.objects.annotate(similarity=TrigramSimilarity('full_name', q))
                .filter(
                    Q(similarity__gt=0.1) |
                    Q(employee_id__icontains=q) |
                    Q(phone__icontains=q) |
                    Q(specializations__icontains=q) |
                    Q(id__in=matching_teacher_ids)
                )
                .order_by('-similarity')[:100]
            )

            class_qs = (
                SchoolClass.objects.annotate(similarity=TrigramSimilarity('name', q))
                .filter(
                    Q(similarity__gt=0.1) |
                    Q(code__icontains=q)
                )
                .order_by('-similarity')[:100]
            )

            # Force evaluation to detect DB-level errors (e.g., missing pg_trgm functions)
            student_list = list(student_qs)
            teacher_list = list(teacher_qs)
            class_list = list(class_qs)
        except DatabaseError:
            # Fallback safe queries for sqlite or missing pg_trgm
            matching_teacher_ids = TeacherSubjectAssignment.objects.filter(
                class_subject__subject__name__icontains=q
            ).values_list('teacher_id', flat=True)

            student_list = list(
                Student.objects.filter(
                    Q(full_name__icontains=q) |
                    Q(student_id__icontains=q) |
                    Q(father_name__icontains=q) |
                    Q(phone__icontains=q)
                ).order_by('full_name')[:100]
            )
            teacher_list = list(
                Teacher.objects.filter(
                    Q(full_name__icontains=q) |
                    Q(employee_id__icontains=q) |
                    Q(phone__icontains=q) |
                    Q(specializations__icontains=q) |
                    Q(id__in=matching_teacher_ids)
                ).order_by('full_name')[:100]
            )
            class_list = list(
                SchoolClass.objects.filter(
                    Q(name__icontains=q) |
                    Q(code__icontains=q)
                ).order_by('name')[:100]
            )

        results = []

        for s in student_list:
            sub_label_parts = []
            if s.student_id:
                sub_label_parts.append(f"ID: {s.student_id}")
            if s.father_name:
                sub_label_parts.append(f"Father: {s.father_name}")
            if s.phone:
                sub_label_parts.append(f"Phone: {s.phone}")
            
            sub_label = " | ".join(sub_label_parts)
            results.append({
                'type': 'student',
                'id': str(s.id),
                'label': _highlight(s.full_name, q),
                'subLabel': _highlight(sub_label, q),
            })

        for t in teacher_list:
            sub_label_parts = []
            if t.employee_id:
                sub_label_parts.append(f"ID: {t.employee_id}")
            if t.specializations:
                sub_label_parts.append(f"Dept/Spec: {', '.join(t.specializations)}")
            if t.phone:
                sub_label_parts.append(f"Phone: {t.phone}")
            
            # Fetch assigned subjects
            assigned_subjects = list(t.subject_assignments.values_list('class_subject__subject__name', flat=True).distinct())
            if assigned_subjects:
                sub_label_parts.append(f"Subjects: {', '.join(assigned_subjects)}")
                
            sub_label = " | ".join(sub_label_parts)
            results.append({
                'type': 'teacher',
                'id': str(t.id),
                'label': _highlight(t.full_name, q),
                'subLabel': _highlight(sub_label, q),
            })

        for c in class_list:
            results.append({
                'type': 'class',
                'id': str(c.id),
                'label': _highlight(c.name, q),
                'subLabel': _highlight(getattr(c, 'code', ''), q),
            })

        # Simple in-memory pagination across combined results
        paginator = Paginator(results, page_size)
        page_obj = paginator.get_page(page)

        return Response({'success': True, 'data': {'results': list(page_obj.object_list), 'count': paginator.count}})
    except Exception as exc:
        logger.exception('Error in search view')
        return Response({'success': False, 'errors': str(exc)}, status=500)
