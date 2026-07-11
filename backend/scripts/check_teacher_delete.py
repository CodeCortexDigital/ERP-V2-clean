import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
import django
django.setup()
from services.education.academics.models import Teacher
print('Teacher count', Teacher.objects.count())
obj = Teacher.objects.filter(is_active=True).first()
print('Sample', obj.id if obj else None, obj.is_active if obj else None)
if obj:
    obj.is_active = False
    obj.save()
    print('Saved inactive', Teacher.objects.get(id=obj.id).is_active)
    obj.is_active = True
    obj.save()
    print('Restored active', Teacher.objects.get(id=obj.id).is_active)
