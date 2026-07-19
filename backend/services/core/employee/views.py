from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Sum

from .models import EmployeeTask, Timesheet, EmployeeDocument
from .serializers import EmployeeTaskSerializer, TimesheetSerializer, EmployeeDocumentSerializer


class EmployeeTaskListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeTaskSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = EmployeeTask.objects.all()
        if not (getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False)):
            queryset = queryset.filter(assignee=user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(created_by=user, assignee=serializer.validated_data.get('assignee') or user)


class EmployeeTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = EmployeeTask.objects.all()
    serializer_class = EmployeeTaskSerializer

    def perform_update(self, serializer):
        # Auto-stamp completed_at when marked done.
        was_done = serializer.instance.status == 'done'
        instance = serializer.save()
        if instance.status == 'done' and not was_done and not instance.completed_at:
            instance.completed_at = timezone.now()
            instance.save(update_fields=['completed_at', 'updated_at'])


class TimesheetListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TimesheetSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Timesheet.objects.all()
        if not (getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False)):
            queryset = queryset.filter(employee=user)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(employee=serializer.validated_data.get('employee') or user)


class TimesheetDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer


class EmployeeDocumentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeDocumentSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = EmployeeDocument.objects.all()
        if not (getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False)):
            queryset = queryset.filter(owner=user)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        file = self.request.FILES.get('file')
        serializer.save(
            owner=serializer.validated_data.get('owner') or user,
            uploaded_by=user,
            file_name=file.name if file else '',
        )


class EmployeeDocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = EmployeeDocument.objects.all()
    serializer_class = EmployeeDocumentSerializer


class EmployeeSummaryView(generics.GenericAPIView):
    """Lightweight aggregate for the employee dashboard widgets."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        tasks = EmployeeTask.objects.filter(assignee=user)
        pending_tasks = tasks.exclude(status='done').exclude(status='cancelled').count()
        done_tasks = tasks.filter(status='done').count()
        timesheets = Timesheet.objects.filter(employee=user)
        total_hours = timesheets.aggregate(total=Sum('hours_worked'))['total'] or 0
        docs = EmployeeDocument.objects.filter(owner=user).count()
        return Response({
            'pending_tasks': pending_tasks,
            'done_tasks': done_tasks,
            'total_hours': float(total_hours),
            'documents': docs,
        })
