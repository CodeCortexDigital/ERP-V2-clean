from django.urls import path
from . import views

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notification-list'),
    path('unread-count/', views.UnreadCountView.as_view(), name='unread-count'),
    path('mark-read/<uuid:pk>/', views.NotificationMarkReadView.as_view(), name='mark-read'),
    path('mark-all-read/', views.NotificationMarkAllReadView.as_view(), name='mark-all-read'),
]
