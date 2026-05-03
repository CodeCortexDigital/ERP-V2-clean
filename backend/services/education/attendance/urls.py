from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet

urlpatterns = [
    path('mark/', AttendanceViewSet.as_view({'post': 'mark_attendance'}), name='mark'),
    path('bulk-mark/', AttendanceViewSet.as_view({'post': 'bulk_mark'}), name='bulk_mark'),
    path('summary/', AttendanceViewSet.as_view({'get': 'get_summary'}), name='summary'),
]

# Also register the default routes
router = DefaultRouter()
router.register(r'records', AttendanceViewSet, basename='attendance')
urlpatterns += router.urls
