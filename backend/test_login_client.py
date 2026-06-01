import os
import django
import json

# Ensure correct settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
# Allow testclient host to avoid DisallowedHost
from django.conf import settings
settings.ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']

django.setup()

from rest_framework.test import APIClient

client = APIClient()

resp = client.post('/api/auth/login/', {'user_id': 'admin@code.com', 'password': 'Admin@123'}, format='json')
print('status_code:', resp.status_code)
try:
    print('response:', json.dumps(resp.data, default=str))
except Exception:
    print('content:', resp.content)
