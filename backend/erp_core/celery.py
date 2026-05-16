import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')

app = Celery('erp_core')

# Load config from Django settings with `CELERY_` namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Broker and backend can be overridden via environment variables
app.conf.broker_url = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
app.conf.result_backend = os.environ.get('CELERY_RESULT_BACKEND', app.conf.broker_url)

# Default queue settings
app.conf.task_default_queue = 'default'

# Automatic discovery of tasks in installed apps
app.autodiscover_tasks()

# Periodic tasks (Celery Beat)
app.conf.beat_schedule = {
    'aggregate-analytics-daily': {
        'task': 'services.core.tasks.analytics_tasks.aggregate_analytics',
        'schedule': crontab(hour=2, minute=0),
    },
    'generate-daily-reports': {
        'task': 'services.core.tasks.analytics_tasks.generate_daily_reports',
        'schedule': crontab(hour=3, minute=0),
    },
}

__all__ = ('app',)
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')

app = Celery('erp_core')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
