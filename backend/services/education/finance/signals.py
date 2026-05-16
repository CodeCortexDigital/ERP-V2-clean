from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Payment, TransactionLog
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone


def log_transaction(user, action, model_name, object_id, object_name, old_value=None, new_value=None):
    """Helper function to log transactions"""
    try:
        TransactionLog.objects.create(
            user=user if user and not isinstance(user, AnonymousUser) else None,
            action=action,
            model_name=model_name,
            object_id=str(object_id),
            object_name=object_name,
            old_value=old_value,
            new_value=new_value,
            timestamp=timezone.now()
        )
    except Exception:
        # Don't let logging errors break the main operation
        pass


@receiver(post_save, sender=Payment)
def log_payment_audit(sender, instance, created, **kwargs):
    """Log payment creation/update"""
    action = 'create' if created else 'update'
    log_transaction(
        user=getattr(instance, '_user', None),
        action=action,
        model_name='Payment',
        object_id=instance.id,
        object_name=f"Payment {instance.id}",
        new_value={
            'amount': str(instance.amount),
            'invoice': instance.invoice.invoice_number,
            'payment_method': instance.payment_method
        }
    )


@receiver(post_save, sender='education_finance.Invoice')
def log_invoice_audit(sender, instance, created, **kwargs):
    """Log invoice creation/update"""
    try:
        from services.core.user_notifications.utils import create_user_notification

        if created:
            title = f"New Invoice Issued: {instance.invoice_number}"
            message = (
                f"A new fee invoice of ${instance.total_amount:.2f} has been issued for "
                f"{instance.student.full_name}. Due date: {instance.due_date}."
            )
            for parent_profile in instance.student.parents.all():
                parent_user = getattr(parent_profile, 'user', None)
                if parent_user:
                    create_user_notification(parent_user, title, message, 'finance')
    except Exception:
        pass

    action = 'create' if created else 'update'
    log_transaction(
        user=getattr(instance, '_user', None),
        action=action,
        model_name='Invoice',
        object_id=instance.id,
        object_name=f"Invoice {instance.invoice_number}",
        new_value={
            'amount': str(instance.amount),
            'student': instance.student.full_name,
            'status': instance.status
        }
    )


@receiver(post_save, sender='education_finance.FeeStructure')
def log_fee_structure_audit(sender, instance, created, **kwargs):
    """Log fee structure creation/update"""
    action = 'create' if created else 'update'
    log_transaction(
        user=getattr(instance, '_user', None),
        action=action,
        model_name='FeeStructure',
        object_id=instance.id,
        object_name=f"Fee Structure {instance.fee_name}",
        new_value={
            'amount': str(instance.amount),
            'class': instance.class_ref.name if instance.class_ref else '',
            'frequency': instance.frequency
        }
    )


@receiver(post_delete, sender=Payment)
def log_payment_deletion(sender, instance, **kwargs):
    """Log payment deletion"""
    log_transaction(
        user=getattr(instance, '_user', None),
        action='delete',
        model_name='Payment',
        object_id=instance.id,
        object_name=f"Payment {instance.id}",
        old_value={
            'amount': str(instance.amount),
            'invoice': instance.invoice.invoice_number
        }
    )


@receiver(post_delete, sender='education_finance.Invoice')
def log_invoice_deletion(sender, instance, **kwargs):
    """Log invoice deletion"""
    log_transaction(
        user=getattr(instance, '_user', None),
        action='delete',
        model_name='Invoice',
        object_id=instance.id,
        object_name=f"Invoice {instance.invoice_number}",
        old_value={
            'amount': str(instance.amount),
            'student': instance.student.full_name
        }
    )
