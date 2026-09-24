"""Admin endpoints for portal login credentials, and self-service password change."""
from django.apps import apps
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.tenants.utils import resolve_tenant_for_user

from .credentials import (
    _user_for_email,
    issue_credential,
    mark_changed_by_user,
    parent_user_for_student,
    student_credentials,
    teacher_credentials,
)
from .decorators import is_admin
from .models import PortalCredential


def _forbidden():
    return Response({'error': 'Only administrators can manage portal logins.'}, status=status.HTTP_403_FORBIDDEN)


def _can_manage(user):
    return bool(user.is_superuser or user.is_staff or is_admin(user))


def _scoped(user, queryset):
    """Non-superusers only see records of their own school (records without a school stay visible)."""
    if user.is_superuser:
        return queryset
    tenant = resolve_tenant_for_user(user)
    if tenant is None:
        return queryset
    from django.db.models import Q
    return queryset.filter(Q(tenant=tenant) | Q(tenant__isnull=True))


def _students(user):
    return _scoped(user, apps.get_model('education_students', 'Student').objects.all())


def _teachers(user):
    return _scoped(user, apps.get_model('education_academics', 'Teacher').objects.all())


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_credential_detail(request, pk):
    if not _can_manage(request.user):
        return _forbidden()
    student = get_object_or_404(_students(request.user), pk=pk)
    return Response(student_credentials(student))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def student_credential_reset(request, pk):
    if not _can_manage(request.user):
        return _forbidden()
    student = get_object_or_404(_students(request.user), pk=pk)
    who = request.query_params.get('who') or request.data.get('who') or 'student'
    user = parent_user_for_student(student) if who == 'parent' else _user_for_email(student.email)
    if not user:
        return Response({'error': f'No {who} portal account exists for this student.'}, status=status.HTTP_404_NOT_FOUND)
    issue_credential(user)
    return Response(student_credentials(student))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_credential_detail(request, pk):
    if not _can_manage(request.user):
        return _forbidden()
    teacher = get_object_or_404(_teachers(request.user), pk=pk)
    return Response(teacher_credentials(teacher))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def teacher_credential_reset(request, pk):
    if not _can_manage(request.user):
        return _forbidden()
    teacher = get_object_or_404(_teachers(request.user), pk=pk)
    user = _user_for_email(teacher.email)
    if not user:
        return Response({'error': 'No portal account exists for this staff member.'}, status=status.HTTP_404_NOT_FOUND)
    issue_credential(user)
    return Response(teacher_credentials(teacher))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def credential_list(request, kind):
    """All stored logins for students or staff: {record id: credentials}. Never issues."""
    if not _can_manage(request.user):
        return _forbidden()
    if kind == 'students':
        rows = _students(request.user).filter(is_active=True)
        data = {str(s.pk): student_credentials(s, issue=False) for s in rows}
    elif kind == 'teachers':
        rows = _teachers(request.user)
        data = {str(t.pk): teacher_credentials(t, issue=False) for t in rows}
    else:
        return Response({'error': 'Unknown list.'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'results': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def credential_issue_missing(request, kind):
    """Give a generated password to accounts that have none on record yet.

    Password hashing is deliberately slow (~1s each), so this works in small
    batches that stay well inside request timeouts: call again while
    ``remaining`` > 0.
    """
    if not _can_manage(request.user):
        return _forbidden()
    try:
        batch = max(1, min(int(request.query_params.get('limit', 8)), 20))
    except ValueError:
        batch = 8
    users = []
    if kind == 'students':
        for s in _students(request.user).filter(is_active=True):
            users.append(_user_for_email(s.email))
            users.append(parent_user_for_student(s))
    elif kind == 'teachers':
        users = [_user_for_email(t.email) for t in _teachers(request.user)]
    else:
        return Response({'error': 'Unknown list.'}, status=status.HTTP_404_NOT_FOUND)
    have = set(PortalCredential.objects.values_list('user_id', flat=True))
    pending, seen = [], set()
    for user in users:
        if user and user.pk not in have and user.pk not in seen and not user.is_superuser:
            pending.append(user)
        if user:
            seen.add(user.pk)
    for user in pending[:batch]:
        issue_credential(user)
    return Response({'issued': min(batch, len(pending)), 'remaining': max(0, len(pending) - batch)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    old_password = request.data.get('old_password') or ''
    new_password = request.data.get('new_password') or ''
    user = request.user
    if not user.check_password(old_password):
        return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_password(new_password, user)
    except ValidationError as e:
        return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_password)
    user.save(update_fields=['password'])
    mark_changed_by_user(user)
    return Response({'message': 'Password changed.'})
