import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
import django
django.setup()

from rest_framework.test import APIRequestFactory
from services.education.academics.views import TeacherDetailView
from services.education.academics.models import Teacher
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()
factory = APIRequestFactory()
obj = Teacher.objects.order_by('created_at').first()
req = factory.delete(f'/api/v1/teachers/{obj.id}/')
req.user = user
response = TeacherDetailView.as_view()(req, id=str(obj.id))
print('status', response.status_code)
print('data', response.data)
print('is_active now', Teacher.objects.get(id=obj.id).is_active)
