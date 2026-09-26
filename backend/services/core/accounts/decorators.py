# backend/services/core/accounts/decorators.py
from functools import wraps
from django.apps import apps
from django.db.models import QuerySet
from rest_framework.response import Response
from rest_framework import status


def normalize_role_name(raw_name):
    """Normalize role name to lowercase string"""
    if not raw_name:
        return None
    return str(raw_name).strip().lower()


def get_user_role(user):
    """Determine user role from database relationships and authentication state."""
    if not getattr(user, 'is_authenticated', False):
        return None

    if getattr(user, 'is_superuser', False):
        return 'admin'

    # A school's own administrator (e.g. whoever signed the school up).
    TenantMembership = apps.get_model('core_tenants', 'TenantMembership')
    if TenantMembership.objects.filter(user=user, role='admin', is_active=True).exists():
        return 'admin'

    if hasattr(user, 'profile') and getattr(user.profile, 'role', None):
        role_obj = user.profile.role
        role_type = getattr(role_obj, 'role_type', None)
        if role_type in ('super_admin', 'school_admin'):
            return 'admin'
        role_name = normalize_role_name(role_obj.name)
        if role_name in ('super admin', 'super_admin', 'school admin', 'school_admin', 'admin'):
            return 'admin'
        if role_name in ('manager', 'hr'):  # named staff roles that may approve leave (role_type defaults to "staff")
            return role_name
        return normalize_role_name(role_type or role_obj.name)

    if hasattr(user, 'parent_profile'):
        return 'parent'

    if hasattr(user, 'teacher_profile'):
        return 'teacher'

    try:
        Student = apps.get_model('education_students', 'Student')
        if user.email and Student.objects.filter(email=user.email).exists():
            return 'student'
    except Exception:
        pass

    # School staff who are not teachers (office helpers, bus crew, cafeteria cashiers, accountants): their only
    # link to the school is a staff membership. Without this they could not sign in at all.
    if TenantMembership.objects.filter(user=user, role__in=('staff', 'accountant'), is_active=True).exists():
        return 'staff'

    return None


def is_admin(user):
    return get_user_role(user) == 'admin'


def is_teacher(user):
    return get_user_role(user) == 'teacher'


def is_parent(user):
    return get_user_role(user) == 'parent'


def is_student(user):
    return get_user_role(user) == 'student'


def is_accountant(user):
    return get_user_role(user) == 'accountant'


def unauthorized_response():
    return Response(
        {'detail': 'Permission denied.'},
        status=status.HTTP_403_FORBIDDEN
    )


def _get_parent_student_ids(user):
    if not hasattr(user, 'parent_profile'):
        return []
    return list(user.parent_profile.linked_students.values_list('id', flat=True))


def _get_teacher_class_ids(user):
    if not hasattr(user, 'teacher_profile'):
        return []

    class_ids = set(user.teacher_profile.assigned_classes.values_list('id', flat=True))

    try:
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        if user.full_name:
            sc_ids = SchoolClass.objects.filter(teacher_name__iexact=user.full_name).values_list('id', flat=True)
            class_ids.update(sc_ids)

        TeacherSubjectAssignment = apps.get_model('education_academics', 'TeacherSubjectAssignment')
        tsa_class_ids = TeacherSubjectAssignment.objects.filter(
            teacher__email=user.email
        ).values_list('class_subject__class_ref_id', flat=True).distinct()
        class_ids.update(tsa_class_ids)

        TimetableEntry = apps.get_model('education_academics', 'TimetableEntry')
        timetable_class_ids = TimetableEntry.objects.filter(
            teacher__email=user.email
        ).values_list('class_subject__class_ref_id', flat=True).distinct()
        class_ids.update(timetable_class_ids)
    except Exception:
        pass

    return list(class_ids)


def _student_queryset_for_role(user, queryset: QuerySet):
    role = get_user_role(user)
    if role == 'admin':
        return queryset
    if role == 'parent':
        student_ids = _get_parent_student_ids(user)
        return queryset.filter(id__in=student_ids)
    if role == 'teacher':
        class_ids = _get_teacher_class_ids(user)
        return queryset.filter(current_class_id__in=class_ids)
    if role == 'student':
        return queryset.filter(email=user.email)
    return queryset.none()


def filter_students_for_user(user, queryset: QuerySet):
    return _student_queryset_for_role(user, queryset)


def filter_attendance_for_user(user, queryset: QuerySet):
    role = get_user_role(user)
    if role == 'admin':
        return queryset
    if role == 'parent':
        return queryset.filter(student_id__in=_get_parent_student_ids(user))
    if role == 'teacher':
        return queryset.filter(student__current_class_id__in=_get_teacher_class_ids(user))
    if role == 'student':
        return queryset.filter(student__email=user.email)
    return queryset.none()


def filter_exams_for_user(user, queryset: QuerySet):
    role = get_user_role(user)
    if role == 'admin':
        return queryset
    if role == 'parent':
        student_ids = _get_parent_student_ids(user)
        return queryset.filter(class_ref__students__id__in=student_ids).distinct()
    if role == 'teacher':
        return queryset.filter(class_ref_id__in=_get_teacher_class_ids(user))
    if role == 'student':
        Student = apps.get_model('education_students', 'Student')
        return queryset.filter(
            class_ref_id__in=Student.objects.filter(email=user.email).values_list('current_class_id', flat=True)
        )
    if role == 'accountant':
        return queryset.none()
    return queryset.none()


def filter_exam_results_for_user(user, queryset: QuerySet):
    role = get_user_role(user)
    if role == 'admin':
        return queryset
    if role == 'parent':
        student_ids = _get_parent_student_ids(user)
        return queryset.filter(student_id__in=student_ids, exam__is_published=True)
    if role == 'teacher':
        return queryset.filter(exam__class_ref_id__in=_get_teacher_class_ids(user))
    if role == 'student':
        return queryset.filter(student__email=user.email, exam__is_published=True)
    return queryset.none()


def filter_invoices_for_user(user, queryset: QuerySet):
    role = get_user_role(user)
    if role in ('admin', 'accountant'):
        return queryset
    if role == 'parent':
        return queryset.filter(student_id__in=_get_parent_student_ids(user))
    if role == 'teacher':
        return queryset.none()
    if role == 'student':
        return queryset.filter(student__email=user.email)
    return queryset.none()


def filter_payments_for_user(user, queryset: QuerySet):
    role = get_user_role(user)
    if role in ('admin', 'accountant'):
        return queryset
    if role == 'parent':
        return queryset.filter(invoice__student_id__in=_get_parent_student_ids(user))
    if role == 'teacher':
        return queryset.none()
    if role == 'student':
        return queryset.filter(invoice__student__email=user.email)
    return queryset.none()


def ensure_teacher_or_admin_for_exam_action(user, exam):
    role = get_user_role(user)
    if role == 'admin':
        return True
    if role != 'teacher':
        return False
    if not hasattr(user, 'teacher_profile'):
        return False
    return exam.class_ref_id in _get_teacher_class_ids(user)


def ensure_student_access_to_exam_result(user, exam_result):
    role = get_user_role(user)
    if role == 'admin':
        return True
    if role == 'parent':
        return exam_result.student_id in _get_parent_student_ids(user) and exam_result.exam.is_published
    if role == 'student':
        return exam_result.student.email == user.email and exam_result.exam.is_published
    if role == 'teacher':
        return exam_result.exam.class_ref_id in _get_teacher_class_ids(user)
    return False


def ensure_student_access(user, student):
    role = get_user_role(user)
    if role == 'admin':
        return True
    if role == 'parent':
        return student.id in _get_parent_student_ids(user)
    if role == 'teacher':
        return student.current_class_id in _get_teacher_class_ids(user)
    if role == 'student':
        return student.email == user.email
    return False


def deny_accountant_exam_access(user):
    return is_accountant(user)


def require_role(allowed_roles):
    """Decorator to restrict access based on user role"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

            user_role = get_user_role(request.user)
            if user_role not in allowed_roles:
                return Response({'error': 'You do not have permission to access this resource'}, status=status.HTTP_403_FORBIDDEN)

            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator


def admin_only(view_func):
    return require_role(['admin'])(view_func)


def teacher_only(view_func):
    return require_role(['admin', 'teacher'])(view_func)


def student_only(view_func):
    return require_role(['admin', 'teacher', 'student'])(view_func)
