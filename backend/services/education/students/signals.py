from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.apps import apps
from .models import Student
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Student)
def track_student_changes(sender, instance, **kwargs):
    """Track when student status changes"""
    if not instance.pk:
        return
    
    try:
        old = Student.objects.get(pk=instance.pk)
        if old.is_active != instance.is_active:
            logger.info(f"Student {instance.student_id} active status changed: {old.is_active} -> {instance.is_active}")
    except Student.DoesNotExist:
        pass

@receiver(post_save, sender=Student)
def update_last_activity_on_save(sender, instance, created, **kwargs):
    """Update last_activity when student is saved"""
    if instance.last_activity != timezone.now():
        # Using update to avoid recursion trigger on post_save
        Student.objects.filter(pk=instance.pk).update(last_activity=timezone.now())

@receiver(post_save, sender=Student)
def create_household_from_parent_fields(sender, instance, raw=False, **kwargs):
    """Students entered through the classic form (father/mother fields) get a
    household and guardian records, so the family tabs are never empty."""
    if raw or instance.household_id or instance.deleted_at:
        return
    if not (instance.father_name or instance.mother_name or instance.guardian_name):
        return
    try:
        from .households import ensure_household

        ensure_household(instance)
    except Exception:
        logger.exception('Could not create a household for student %s', instance.pk)


# Track attendance changes on student activity if attendance model is available
def track_attendance_activity(sender, instance, created, **kwargs):
    if instance.student:
        Student.objects.filter(id=instance.student.id).update(last_activity=timezone.now())

try:
    attendance_model = apps.get_model('education_attendance', 'Attendance')
    post_save.connect(track_attendance_activity, sender=attendance_model)
except Exception:
    pass
