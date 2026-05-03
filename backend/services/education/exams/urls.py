from django.urls import path
from .views import ExamsViewSet

urlpatterns = [
    path('', ExamsViewSet.as_view({'get': 'list'})),
    path('<str:pk>/', ExamsViewSet.as_view({'get': 'retrieve'})),
]
