"""Prometheus metrics HTTP endpoint for backup monitoring (placeholder)."""
from django.http import HttpResponse

def backup_metrics_view(request):
    """Placeholder for backup metrics - prometheus not configured."""
    return HttpResponse("Backup metrics not configured. Install prometheus-client.", content_type="text/plain", status=501)
