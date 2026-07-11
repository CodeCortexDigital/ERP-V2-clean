import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
import django
django.setup()

from django.test import Client
from services.education.academics.models import Teacher

client = Client()
obj = Teacher.objects.order_by('created_at').first()
response = client.patch(
    f'/api/v1/teachers/{obj.id}/',
    {'is_active': False},
    content_type='application/json',
    HTTP_AUTHORIZATION='Bearer mock-access-token',
)
print('status', response.status_code)
print('content', response.content.decode())
obj.refresh_from_db()
print('is_active after patch', obj.is_active)
