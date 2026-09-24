import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.apps import apps
from django.contrib.auth import get_user_model

from .credentials import issue_credential

logger = logging.getLogger(__name__)
User = get_user_model()

@receiver(post_save, sender='education_students.Student')
def sync_student_user(sender, instance, created, **kwargs):
    """
    Auto-create user account and parent profile/account when a student is saved.
    """
    if not instance.email:
        return
    
    try:
        # Check/create Student User account
        user, user_created = User.objects.get_or_create(
            email=instance.email,
            defaults={
                'full_name': instance.full_name,
                'phone_number': instance.phone,
                'account_status': 'active',
                'is_active': True
            }
        )
        if user_created:
            # Own random password; printed on the admission letter.
            issue_credential(user)
            logger.info(f"Auto-created Student User for {instance.full_name} ({instance.email})")

        # Auto-create/link Parent User account and Profile if guardian info exists
        if instance.guardian_phone:
            clean_phone = ''.join(c for c in instance.guardian_phone if c.isdigit())
            if clean_phone:
                parent_email = f"parent.{clean_phone}@school.edu"
                parent_user, parent_created = User.objects.get_or_create(
                    email=parent_email,
                    defaults={
                        'full_name': instance.father_name or f"Parent of {instance.full_name}",
                        'phone_number': instance.guardian_phone,
                        'account_status': 'active',
                        'is_active': True
                    }
                )
                if parent_created:
                    issue_credential(parent_user)
                    logger.info(f"Auto-created Parent User for {parent_user.full_name} ({parent_email})")
                
                # Check/create ParentProfile
                ParentProfile = apps.get_model('core_accounts', 'ParentProfile')
                parent_profile, _ = ParentProfile.objects.get_or_create(
                    user=parent_user,
                    defaults={
                        'phone': instance.guardian_phone,
                        'relationship_type': 'father' if instance.father_name else 'guardian'
                    }
                )
                # Link student to this parent
                if instance not in parent_profile.linked_students.all():
                    parent_profile.linked_students.add(instance)
                    logger.info(f"Linked Student {instance.student_id} to Parent Profile {parent_email}")
                    
    except Exception as e:
        logger.error(f"Error syncing student/parent user on save: {e}", exc_info=True)


@receiver(post_save, sender='education_academics.Teacher')
def sync_teacher_user(sender, instance, created, **kwargs):
    """
    Auto-create user account and teacher profile when a teacher is saved.
    """
    if not instance.email:
        return
    
    try:
        # Check/create Teacher User account
        user, user_created = User.objects.get_or_create(
            email=instance.email,
            defaults={
                'full_name': instance.full_name,
                'phone_number': instance.phone,
                'account_status': 'active',
                'is_active': True
            }
        )
        if user_created:
            # Own random password; printed on the job offer letter.
            issue_credential(user)
            logger.info(f"Auto-created Teacher User for {instance.full_name} ({instance.email})")
            
        # Check/create TeacherProfile
        TeacherProfile = apps.get_model('core_accounts', 'TeacherProfile')
        teacher_profile, profile_created = TeacherProfile.objects.get_or_create(
            user=user,
            defaults={
                'employee_id': instance.employee_id,
                'phone': instance.phone,
                'qualification': ', '.join(instance.qualifications) if isinstance(instance.qualifications, list) else str(instance.qualifications),
                'specialization': ', '.join(instance.specializations) if isinstance(instance.specializations, list) else str(instance.specializations),
                'hire_date': instance.joining_date,
                'is_active': instance.is_active
            }
        )
        if profile_created:
            logger.info(f"Auto-created TeacherProfile for {instance.full_name} ({instance.employee_id})")
            
    except Exception as e:
        logger.error(f"Error syncing teacher user on save: {e}", exc_info=True)
