from django.core.paginator import Paginator
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Value
from django.db import DatabaseError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)

import re
import html

from services.education.students.models import Student
from services.education.academics.models import SchoolClass, Teacher


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
        # Try trigram queries and evaluate them; if similarity() missing, fallback to icontains
        try:
            student_qs = (
                Student.objects.annotate(similarity=TrigramSimilarity('full_name', q))
                .filter(similarity__gt=0.1)
                .order_by('-similarity')[:100]
            )

            teacher_qs = (
                Teacher.objects.annotate(similarity=TrigramSimilarity('full_name', q))
                .filter(similarity__gt=0.1)
                .order_by('-similarity')[:100]
            )

            class_qs = (
                SchoolClass.objects.annotate(similarity=TrigramSimilarity('name', q))
                .filter(similarity__gt=0.1)
                .order_by('-similarity')[:100]
            )

            # Force evaluation to detect DB-level errors (e.g., missing pg_trgm functions)
            student_list = list(student_qs)
            teacher_list = list(teacher_qs)
            class_list = list(class_qs)
        except DatabaseError:
            # Fallback safe queries for sqlite or missing pg_trgm
            student_list = list(Student.objects.filter(full_name__icontains=q).order_by('full_name')[:100])
            teacher_list = list(Teacher.objects.filter(full_name__icontains=q).order_by('full_name')[:100])
            class_list = list(SchoolClass.objects.filter(name__icontains=q).order_by('name')[:100])

        results = []

        for s in student_list:
            results.append({
                'type': 'student',
                'id': str(s.id),
                'label': _highlight(s.full_name, q),
                'subLabel': _highlight(getattr(s, 'student_id', ''), q),
            })

        for t in teacher_list:
            results.append({
                'type': 'teacher',
                'id': str(t.id),
                'label': _highlight(t.full_name, q),
                'subLabel': _highlight(getattr(t, 'employee_id', ''), q),
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
