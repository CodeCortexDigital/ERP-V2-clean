"""
Role-based access control for stored files.
"""

from __future__ import annotations

from django.apps import apps

from services.core.accounts.decorators import (
    get_user_role,
    is_admin,
)


def can_access_file(user, stored_file) -> bool:
    """Return True if user may download the file."""
    if not user or not getattr(user, 'is_authenticated', False):
        return False

    if stored_file.is_public:
        return True

    if is_admin(user):
        return True

    role = get_user_role(user)
    if role in ('admin', 'staff', 'accountant'):
        return True

    if stored_file.uploaded_by_id == user.id:
        return True

    model_label = stored_file.related_model
    related_id = stored_file.related_id

    if model_label == 'education_students.Student' and related_id:
        return _can_access_student_file(user, role, related_id)

    if model_label == 'education_finance.Invoice' and related_id:
        return _can_access_invoice_file(user, role, related_id)

    if stored_file.related_model == 'temp':
        return stored_file.uploaded_by_id == user.id

    return role == 'teacher'


def _can_access_student_file(user, role: str | None, student_id) -> bool:
    Student = apps.get_model('education_students', 'Student')
    try:
        student = Student.objects.get(pk=student_id)
    except Student.DoesNotExist:
        return False

    if role == 'student' and user.email == student.email:
        return True

    if role == 'parent' and hasattr(user, 'parent_profile'):
        return user.parent_profile.linked_students.filter(pk=student_id).exists()

    if role == 'teacher' and hasattr(user, 'teacher_profile'):
        class_ids = list(user.teacher_profile.assigned_classes.values_list('id', flat=True))
        return student.current_class_id in class_ids

    return False


def _can_access_invoice_file(user, role: str | None, invoice_id) -> bool:
    if role in ('admin', 'accountant', 'staff'):
        return True
    Invoice = apps.get_model('education_finance', 'Invoice')
    try:
        invoice = Invoice.objects.select_related('student').get(pk=invoice_id)
    except Invoice.DoesNotExist:
        return False
    if role == 'parent' and hasattr(user, 'parent_profile'):
        return user.parent_profile.linked_students.filter(pk=invoice.student_id).exists()
    if role == 'student' and user.email == invoice.student.email:
        return True
    return False


def log_file_download(request, stored_file, *, action: str = 'VIEW') -> None:
    """Audit trail for file downloads."""
    try:
        from services.core.audit.models import AuditLog

        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action=action,
            resource_type='StoredFile',
            resource_id=stored_file.id,
            new_data={
                'storage_key': stored_file.storage_key,
                'original_name': stored_file.original_name,
                'bucket_type': stored_file.bucket_type,
            },
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=(request.META.get('HTTP_USER_AGENT') or '')[:512],
        )
    except Exception:
        pass
