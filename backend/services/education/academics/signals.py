from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Homework
from services.core.user_notifications.utils import (
    create_user_notifications_for_student_and_parents,
)


def _notify_homework_students(instance: Homework):
    """Create in-app notifications for students (and parents) of the homework class."""
    try:
        from services.education.students.models import Student

        if instance.class_ref_id:
            students = Student.objects.filter(
                current_class_id=instance.class_ref_id, is_active=True
            )
        elif instance.class_name:
            students = Student.objects.filter(
                current_class__name=instance.class_name, is_active=True
            )
        else:
            students = Student.objects.none()

        if not students.exists():
            return

        subject = instance.subject_name or "your class"
        due = f" due on {instance.due_date}" if instance.due_date else ""
        title = f"New Homework: {instance.title}"
        message = (
            f"Homework assigned for {subject} ({instance.class_name}){due}. "
            f"{instance.description or ''}".strip()
        )

        for student in students:
            create_user_notifications_for_student_and_parents(
                student, title, message, notification_type="homework"
            )
    except Exception as exc:
        print(f"Homework notification error: {exc}")


@receiver(post_save, sender=Homework)
def homework_notify_students(sender, instance, created, **kwargs):
    """Notify students/parents when new homework is assigned."""
    if not created:
        return

    transaction.on_commit(lambda: _notify_homework_students(instance))
