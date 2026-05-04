from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import generics
from django.apps import apps
from rest_framework import serializers

def health_check(request):
    return JsonResponse({"status": "ok", "message": "Server is running"})

# Add Class Serializer and View here temporarily
class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = apps.get_model('education_academics', 'SchoolClass')
        fields = ['id', 'name', 'code', 'capacity', 'is_active']

class ClassListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ClassSerializer
    
    def get_queryset(self):
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        return SchoolClass.objects.filter(is_active=True)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health'),
    path('api/auth/', include('services.core.accounts.urls')),
    path('api/education/students/', include('services.education.students.urls')),
    path('api/classes/', ClassListView.as_view(), name='classes'),
]
