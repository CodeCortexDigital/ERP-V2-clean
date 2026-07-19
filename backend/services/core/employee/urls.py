from django.urls import path
from . import views

urlpatterns = [
    path('employee/tasks/', views.EmployeeTaskListCreateView.as_view(), name='employee-task-list'),
    path('employee/tasks/<str:id>/', views.EmployeeTaskDetailView.as_view(), name='employee-task-detail'),
    path('employee/timesheets/', views.TimesheetListCreateView.as_view(), name='timesheet-list'),
    path('employee/timesheets/<str:id>/', views.TimesheetDetailView.as_view(), name='timesheet-detail'),
    path('employee/documents/', views.EmployeeDocumentListCreateView.as_view(), name='employee-document-list'),
    path('employee/documents/<str:id>/', views.EmployeeDocumentDetailView.as_view(), name='employee-document-detail'),
    path('employee/summary/', views.EmployeeSummaryView.as_view(), name='employee-summary'),
]
