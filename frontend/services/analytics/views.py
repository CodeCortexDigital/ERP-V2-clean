# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from datetime import datetime

@api_view(['GET'])
@permission_classes([AllowAny])
def kpis(request):
    return Response({
        'total_students': 5,
        'total_employees': 0,
        'total_revenue': 125000,
        'growth': 15.5,
        'active_courses': 12,
        'attendance_rate': 94.5
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def dashboards(request):
    return Response([
        {
            'id': 1,
            'name': 'Executive Dashboard',
            'widgets': [
                {'id': 1, 'type': 'line', 'title': 'Revenue Trend'},
                {'id': 2, 'type': 'bar', 'title': 'Student Enrollment'},
                {'id': 3, 'type': 'metric', 'title': 'KPIs'}
            ]
        }
    ])

@api_view(['GET'])
@permission_classes([AllowAny])
def metrics(request):
    period = request.GET.get('period', 'month')
    return Response({
        'period': period,
        'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        'datasets': {
            'revenue': [10000, 12000, 15000, 18000, 22000, 25000],
            'students': [50, 55, 62, 68, 72, 78],
            'courses': [8, 9, 10, 11, 12, 12]
        }
    })
