from django.apps import apps
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model


@receiver(post_save, sender='education_communication.Notification')
def create_announcement_notifications(sender, instance, created, **kwargs):
    """Create UI notifications when a communication announcement is created."""
    if not created:
        return

    try:
        from services.core.user_notifications.utils import create_user_notification

        User = get_user_model()
        Student = apps.get_model('education_students', 'Student')
        ParentProfile = apps.get_model('core_accounts', 'ParentProfile')

        title = instance.title
        message = instance.message

        if instance.recipient_type == 'all':
            users = User.objects.filter(is_active=True)
            for user in users:
                create_user_notification(user, title, message, 'announcement')
            return

        if instance.recipient_type == 'student':
            student = Student.objects.filter(student_id=instance.recipient_id).first()
            if not student:
                student = Student.objects.filter(email__iexact=instance.recipient_id).first()
            if student:
                student_user = User.objects.filter(email__iexact=student.email).first()
                if student_user:
                    create_user_notification(student_user, title, message, 'announcement')
                for parent_profile in student.parents.all():
                    parent_user = getattr(parent_profile, 'user', None)
                    if parent_user:
                        create_user_notification(parent_user, title, message, 'announcement')
            return

        if instance.recipient_type == 'parent':
            recipient_user = User.objects.filter(email__iexact=instance.recipient_id).first() or User.objects.filter(id=instance.recipient_id).first()
            if recipient_user:
                create_user_notification(recipient_user, title, message, 'announcement')
            return

        # Fallback to matching parent profiles by recipient id
        if instance.recipient_id:
            parent_profiles = ParentProfile.objects.filter(user__email__iexact=instance.recipient_id)
            for parent_profile in parent_profiles:
                parent_user = getattr(parent_profile, 'user', None)
                if parent_user:
                    create_user_notification(parent_user, title, message, 'announcement')
    except Exception:
        pass
