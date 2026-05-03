from django.urls import path, include

urlpatterns = [
    path('v1/', include('attendance.api.v1.urls')),
]