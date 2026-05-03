from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Exam, ExamResult, ExamRegistration
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Exam)
def track_exam_changes(sender, instance, **kwargs):
    """Track when exam status changes"""
    if not instance.pk:
        return
    
    try:
        old = Exam.objects.get(pk=instance.pk)
        if old.status != instance.status:
            logger.info(f"Exam {instance.code} status changed: {old.status} -> {instance.status}")
    except Exam.DoesNotExist:
        pass

@receiver(post_save, sender=ExamRegistration)
def update_registration_count(sender, instance, created, **kwargs):
    """Update exam registration count"""
    if created:
        exam = instance.exam
        exam.total_students = exam.registrations.count()
        exam.save()
        logger.info(f"Student registered for exam {exam.code}")

@receiver(post_save, sender=ExamResult)
def update_exam_statistics(sender, instance, created, **kwargs):
    """Update exam statistics when results are added"""
    if created:
        exam = instance.exam
        # Update appeared students count
        exam.appeared_students = exam.results.exclude(is_absent=True).count()
        exam.save()
        logger.info(f"Result added for exam {exam.code}")

@receiver(post_save, sender=Exam)
def create_exam_schedule_notification(sender, instance, created, **kwargs):
    """Log when exam is scheduled"""
    if created:
        logger.info(f"New exam created: {instance.code} - {instance.title}")
    elif instance.status == 'published':
        logger.info(f"Exam {instance.code} published")
    elif instance.status == 'results_published':
        logger.info(f"Results published for exam {instance.code}")