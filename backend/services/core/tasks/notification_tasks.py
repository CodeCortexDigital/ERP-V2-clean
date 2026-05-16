from celery import shared_task, Task
from celery.utils.log import get_task_logger
from typing import Dict

logger = get_task_logger(__name__)


class BaseRetryTask(Task):
    autoretry_for = (Exception,)
    max_retries = 5
    retry_backoff = True
    retry_backoff_max = 16
    retry_jitter = True


@shared_task(bind=True, base=BaseRetryTask, name='services.core.tasks.notification_tasks.send_attendance_notification')
def send_attendance_notification(self, payload: Dict):
    """Send notification when attendance is marked.

    Payload example: { 'student_id': '...', 'status': 'absent', 'date': 'YYYY-MM-DD' }
    """
    try:
        # Minimal implementation: log and simulate sending
        logger.info('Sending attendance notification: %s', payload)
        # TODO: integrate with notifications service / email / push
        return {'ok': True}
    except Exception as exc:
        logger.exception('Attendance notification failed')
        raise


@shared_task(bind=True, base=BaseRetryTask, name='services.core.tasks.notification_tasks.generate_invoice_pdf')
def generate_invoice_pdf(self, payload: Dict):
    """Generate a PDF for an invoice in background.

    Payload example: { 'invoice_id': '...' }
    """
    try:
        invoice_id = payload.get('invoice_id')
        logger.info('Generating PDF for invoice %s', invoice_id)
        # TODO: call PDF generation service and persist file
        return {'invoice_id': invoice_id}
    except Exception:
        logger.exception('Invoice PDF generation failed')
        raise


@shared_task(bind=True, base=BaseRetryTask, name='services.core.tasks.notification_tasks.send_result_whatsapp')
def send_result_whatsapp(self, payload: Dict):
    """Send WhatsApp message when results published.

    Payload example: { 'student_id': '...', 'result_url': '...' }
    """
    try:
        logger.info('Queuing result WhatsApp: %s', payload)
        # TODO: integrate with WhatsApp sender task/service
        return {'ok': True}
    except Exception:
        logger.exception('Result WhatsApp failed')
        raise


@shared_task(bind=True, base=BaseRetryTask, name='services.core.tasks.notification_tasks.send_welcome_email')
def send_welcome_email(self, payload: Dict):
    """Send welcome email to newly enrolled student/parent.

    Payload example: { 'student_id': '...', 'email': '...' }
    """
    try:
        logger.info('Sending welcome email: %s', payload)
        # TODO: integrate with email backend
        return {'ok': True}
    except Exception:
        logger.exception('Welcome email failed')
        raise


@shared_task(bind=True, base=BaseRetryTask, name='services.core.tasks.notification_tasks.bulk_whatsapp')
def bulk_whatsapp(self, payload: Dict):
    """Send many WhatsApp messages in bulk.

    Payload example: { 'messages': [ {to, template, vars}, ... ] }
    """
    try:
        messages = payload.get('messages', [])
        logger.info('Sending bulk whatsapp messages: count=%d', len(messages))
        # TODO: chunking, rate limit handling
        return {'sent': len(messages)}
    except Exception:
        logger.exception('Bulk WhatsApp failed')
        raise
