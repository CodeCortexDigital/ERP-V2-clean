from django.urls import path, include

urlpatterns = [
    path('v1/', include('exams.api.v1.urls')),
]