"""URLs for health check endpoints."""
from django.urls import path
from .views import health_check, readiness_check, liveness_check, detailed_health

app_name = 'health'

urlpatterns = [
    path('', health_check, name='health-check'),
    path('ready/', readiness_check, name='readiness-check'),
    path('live/', liveness_check, name='liveness-check'),
    path('detailed/', detailed_health, name='detailed-health'),
]
