import logging

from celery import shared_task
from django.apps import apps
from django.utils import timezone

from .service import WhatsAppService

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 5})
def send_whatsapp_message(self, message_id):
    Message = apps.get_model('education_communication', 'Message')
    msg = Message.objects.get(id=message_id)

    if msg.channel != 'whatsapp':
        logger.warning('Attempted to send non-whatsapp message via WhatsApp task: %s', message_id)
        return False

    if msg.is_delivered and msg.delivery_status == 'delivered':
        return True

    msg.last_attempt_at = timezone.now()
    msg.retry_count += 1
    msg.save(update_fields=['last_attempt_at', 'retry_count'])

    service = WhatsAppService(tenant_id=msg.legacy_tenant_code or None)
    payload = {
        'body': msg.message,
    }
    template_name = msg.template_name or None

    try:
        result = service.send_message(msg.recipient_phone, template_name, payload)
        external_id = result.get('external_id')
        msg.external_id = external_id or msg.external_id
        msg.delivery_status = 'delivered'
        msg.is_delivered = True
        msg.delivered_at = timezone.now()
        msg.save(update_fields=['external_id', 'delivery_status', 'is_delivered', 'delivered_at'])
        logger.info('WhatsApp message delivered: %s', message_id)
        return True
    except Exception as exc:
        msg.delivery_status = 'failed'
        msg.save(update_fields=['delivery_status'])
        logger.error('WhatsApp send failed for %s: %s', message_id, exc)
        raise self.retry(exc=exc)


@shared_task
def process_whatsapp_queue():
    Message = apps.get_model('education_communication', 'Message')
    pending_messages = Message.objects.filter(channel='whatsapp', is_delivered=False, retry_count__lt=5)

    for message in pending_messages:
        send_whatsapp_message.delay(str(message.id))

    return {'queued': pending_messages.count()}
