from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Payment
from services.core.accounts.audit_models import log_action

@receiver(post_save, sender=Payment)
def log_payment_audit(sender, instance, created, **kwargs):
    """Log payment creation/update"""
    action = 'create' if created else 'update'
    log_action(
        user=None,  # Will be populated from request context
        action=action,
        module='finance',
        object_id=instance.id,
        object_name=f"Payment {instance.payment_id}",
        old_value=None if created else {'old': 'updated'},
        new_value={'amount': str(instance.amount), 'invoice': instance.invoice.invoice_number}
    )
