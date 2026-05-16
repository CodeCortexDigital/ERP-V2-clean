from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Exam, ExamResult
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Exam)
def track_exam_changes(sender, instance, **kwargs):
    """Track when exam publish or active state changes."""
    if not instance.pk:
        return

    try:
        old = Exam.objects.get(pk=instance.pk)
        if old.is_published != instance.is_published:
            logger.info(
                f"Exam {instance.exam_code} publish status changed: "
                f"{old.is_published} -> {instance.is_published}"
            )
        if old.is_active != instance.is_active:
            logger.info(
                f"Exam {instance.exam_code} active state changed: "
                f"{old.is_active} -> {instance.is_active}"
            )
    except Exam.DoesNotExist:
        pass

@receiver(post_save, sender=ExamResult)
def notify_on_result_creation(sender, instance, created, **kwargs):
    """Send notifications when a new exam result is created."""
    if not created:
        return

    logger.info(f"Result added for exam {instance.exam.exam_code} and student {instance.student.full_name}")

    try:
        from services.core.user_notifications.utils import create_user_notifications_for_student_and_parents

        title = f"Exam Result Published: {instance.exam.title}"
        message = (
            f"{instance.student.full_name} has received {instance.grade} "
            f"({instance.percentage:.2f}%) for {instance.exam.title}."
        )
        create_user_notifications_for_student_and_parents(
            instance.student,
            title,
            message,
            'exam'
        )
    except Exception as e:
        logger.error(f"Failed to create exam notifications: {e}")

@receiver(post_save, sender=Exam)
def log_exam_state(sender, instance, created, **kwargs):
    """Log exam lifecycle events."""
    if created:
        logger.info(f"New exam created: {instance.exam_code} - {instance.title}")
    elif instance.is_published:
        logger.info(f"Exam {instance.exam_code} is now published")
