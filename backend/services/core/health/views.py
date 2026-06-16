from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .utils import get_system_health


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint that returns system status.

    Returns:
        - Database status
        - Redis cache status
        - Celery worker status
    """
    health_data = get_system_health()

    http_status = status.HTTP_200_OK if health_data['status'] == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(health_data, status=http_status)


@api_view(['GET'])
@permission_classes([AllowAny])
def readiness_check(request):
    """
    Kubernetes readiness probe endpoint.
    Service is ready if database is accessible.
    """
    health_data = get_system_health()
    database_status = health_data['checks']['database']['status']

    if database_status == 'healthy':
        return Response({'status': 'ready'}, status=status.HTTP_200_OK)
    return Response(
        {'status': 'not_ready', 'reason': 'Database unavailable'},
        status=status.HTTP_503_SERVICE_UNAVAILABLE
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def liveness_check(request):
    """
    Kubernetes liveness probe endpoint.
    Service is alive if it can respond to requests.
    """
    return Response({'status': 'alive'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def detailed_health(request):
    """
    Detailed health check with all component statuses.
    Intended for monitoring and debugging.
    """
    health_data = get_system_health()
    return Response(health_data, status=status.HTTP_200_OK)
