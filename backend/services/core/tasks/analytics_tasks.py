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


@shared_task(bind=True, base=BaseRetryTask, name='services.core.tasks.analytics_tasks.aggregate_analytics')
def aggregate_analytics(self, payload: Dict = None):
    """Aggregate analytics snapshots. Runs daily by default.

    Payload optional to scope tenant/date ranges.
    """
    try:
        logger.info('Running analytics aggregation: %s', payload)
        # TODO: perform aggregation queries and persist results
        return {'ok': True}
    except Exception:
        logger.exception('Analytics aggregation failed')
        raise


@shared_task(bind=True, base=BaseRetryTask, name='services.core.tasks.analytics_tasks.generate_daily_reports')
def generate_daily_reports(self, payload: Dict = None):
    try:
        logger.info('Generating daily reports: %s', payload)
        # TODO: trigger report generation tasks, store links
        return {'ok': True}
    except Exception:
        logger.exception('Daily reports generation failed')
        raise


@shared_task(bind=True, base=BaseRetryTask, name='services.core.tasks.analytics_tasks.generate_weekly_reports')
def generate_weekly_reports(self, payload: Dict = None):
    try:
        logger.info('Generating weekly reports: %s', payload)
        # TODO: aggregate and export weekly reports
        return {'ok': True}
    except Exception:
        logger.exception('Weekly reports generation failed')
        raise
