from django.urls import path
from .views import StudentsViewSet


    path('student-dashboard/<str:student_id>/', views.student_dashboard, name='student-dashboard'),
    path('', StudentsViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<str:pk>/', StudentsViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'})),
]


