"""A cafeteria top-up is billed as an invoice; once that invoice is paid (at the office or online) the money is added."""
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='education_finance.Invoice')
def credit_top_up_when_paid(sender, instance, **kwargs):
    if instance.status == 'paid':
        from .api import credit_paid_top_up

        credit_paid_top_up(instance)
