from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import Student, Enrollment, Document, Note
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Student)
def track_student_changes(sender, instance, **kwargs):
    """Track when student information changes"""
    if not instance.pk:
        return
    
    try:
        old = Student.objects.get(pk=instance.pk)
        
        # Track status changes
        if old.status != instance.status:
            logger.info(f"Student {instance.student_id} status changed: {old.status} -> {instance.status}")
            
            # Create note about status change
            Note.objects.create(
                student=instance,
                note_type='general',
                author_name='System',
                author_role='system',
                content=f"Status changed from {old.get_status_display()} to {instance.get_status_display()}",
                is_private=True
            )
        
        # Track program changes
        if old.program_id != instance.program_id:
            logger.info(f"Student {instance.student_id} program changed")
            Note.objects.create(
                student=instance,
                note_type='academic',
                author_name='System',
                author_role='system',
                content=f"Program changed from {old.program_code} to {instance.program_code}",
                is_private=True
            )
            
    except Student.DoesNotExist:
        pass

@receiver(post_save, sender=Student)
def create_student_welcome_note(sender, instance, created, **kwargs):
    """Create welcome note when student is created"""
    if created:
        Note.objects.create(
            student=instance,
            note_type='general',
            author_name='System',
            author_role='system',
            content=f"Welcome {instance.get_full_name}! Student record created.",
            is_private=True
        )
        logger.info(f"New student created: {instance.student_id} - {instance.get_full_name}")

@receiver(post_save, sender=Enrollment)
def update_enrollment_counts(sender, instance, created, **kwargs):
    """Update enrollment counts when enrollment changes"""
    if created:
        logger.info(f"New enrollment created: {instance.student.student_id} - Course {instance.course_id}")

@receiver(post_save, sender=Document)
def track_document_uploads(sender, instance, created, **kwargs):
    """Track when documents are uploaded"""
    if created:
        Note.objects.create(
            student=instance.student,
            note_type='general',
            author_name='System',
            author_role='system',
            content=f"Document uploaded: {instance.get_document_type_display()} - {instance.file_name}",
            is_private=True
        )
        logger.info(f"Document uploaded for student {instance.student.student_id}")

@receiver(pre_save, sender=Document)
def track_document_verification(sender, instance, **kwargs):
    """Track when documents are verified"""
    if not instance.pk:
        return
    
    try:
        old = Document.objects.get(pk=instance.pk)
        if not old.is_verified and instance.is_verified:
            Note.objects.create(
                student=instance.student,
                note_type='general',
                author_name='System',
                author_role='system',
                content=f"Document verified: {instance.get_document_type_display()}",
                is_private=True
            )
            logger.info(f"Document {instance.id} verified for student {instance.student.student_id}")
    except Document.DoesNotExist:
        pass

@receiver(post_delete, sender=Document)
def cleanup_document_file(sender, instance, **kwargs):
    """Delete physical file when document record is deleted"""
    if instance.file:
        storage = instance.file.storage
        if storage.exists(instance.file.name):
            storage.delete(instance.file.name)
            logger.info(f"Deleted file: {instance.file.name}")

@receiver(post_save, sender=Note)
def log_note_creation(sender, instance, created, **kwargs):
    """Log when notes are created"""
    if created:
        logger.info(f"Note added to student {instance.student.student_id} by {instance.author_name}")

@receiver(post_save, sender=Enrollment)
def update_grade_summary(sender, instance, **kwargs):
    """Update grade summary when enrollment grades change"""
    # This would trigger recalculation of GPA
    # Implement when grade-scale service is ready
    pass

@receiver(post_save, sender=Enrollment)
def update_attendance_summary(sender, instance, **kwargs):
    """Update attendance summary when attendance changes"""
    # This would trigger recalculation of attendance percentage
    # Implement when attendance service is ready
    pass
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Student

@receiver(post_save, sender=Student)
def update_last_activity_on_save(sender, instance, created, **kwargs):
    """Update last_activity when student is saved"""
    if instance.last_activity != timezone.now():
        instance.last_activity = timezone.now()
        instance.save(update_fields=['last_activity'])

# Also track attendance changes
def track_attendance_activity(sender, instance, created, **kwargs):
    from services.education.students.models import Student
    if instance.student:
        student = Student.objects.filter(id=instance.student.id).first()
        if student:
            student.last_activity = timezone.now()
            student.save(update_fields=['last_activity'])

# Try to connect attendance signal
try:
    attendance_model = apps.get_model('education_attendance', 'Attendance')
    from django.db.models.signals import post_save
    post_save.connect(track_attendance_activity, sender=attendance_model)
except:
    pass
