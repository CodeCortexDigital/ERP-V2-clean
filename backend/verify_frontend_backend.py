import django
import os
import json
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps
from django.contrib.auth import get_user_model

User = get_user_model()
Student = apps.get_model('education_students', 'Student')

print("=" * 70)
print("📊 BACKEND VS FRONTEND DATA VERIFICATION")
print("=" * 70)

# 1. Backend Data Summary
print("\n🔹 BACKEND DATA:")
print("-" * 50)
total_backend = Student.objects.count()
print(f"   Total Students in Database: {total_backend}")

print("\n   Last 10 Students in Database:")
for s in Student.objects.all().order_by('-created_at')[:10]:
    print(f"      • {s.full_name} (ID: {s.student_id}) - Class: {s.current_class.name if s.current_class else 'None'}")

# 2. Get data from Frontend API
print("\n🔹 FRONTEND API DATA:")
print("-" * 50)

# Login to get token
login_url = "http://localhost:8000/api/auth/login/"
login_data = {"email": "admin@code.com", "password": "admin123"}

try:
    login_resp = requests.post(login_url, json=login_data)
    if login_resp.status_code == 200:
        token = login_resp.json().get('access')
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get students from API
        api_url = "http://localhost:8000/api/auth/students/"
        api_resp = requests.get(api_url, headers=headers)
        
        if api_resp.status_code == 200:
            api_students = api_resp.json()
            if isinstance(api_students, list):
                total_api = len(api_students)
            elif isinstance(api_students, dict) and 'results' in api_students:
                total_api = len(api_students['results'])
            else:
                total_api = 0
            
            print(f"   Total Students from API: {total_api}")
            
            print("\n   Students from API (First 10):")
            students_list = api_students if isinstance(api_students, list) else api_students.get('results', [])
            for s in students_list[:10]:
                print(f"      • {s.get('full_name', 'N/A')} (ID: {s.get('student_id', 'N/A')})")
        else:
            print(f"   ❌ API Error: {api_resp.status_code}")
            total_api = 0
    else:
        print(f"   ❌ Login Failed: {login_resp.status_code}")
        total_api = 0
except Exception as e:
    print(f"   ❌ Connection Error: {e}")
    total_api = 0

# 3. Comparison
print("\n🔹 COMPARISON:")
print("-" * 50)
print(f"   Backend Database: {total_backend} students")
print(f"   Frontend API: {total_api} students")

if total_backend == total_api:
    print("\n   ✅ DATA MATCHES! Backend and Frontend are in sync.")
elif total_api == 0:
    print("\n   ⚠️ Frontend API returned 0 students - Check if backend is running and API is working")
elif total_backend > total_api:
    print(f"\n   ⚠️ Backend has {total_backend - total_api} more students than Frontend")
else:
    print(f"\n   ⚠️ Frontend has {total_api - total_backend} more students than Backend")

# 4. Check if data generation script was run
print("\n🔹 DATA GENERATION STATUS:")
print("-" * 50)
if total_backend > 3:
    print(f"   ✅ Data generation was successful! {total_backend} students in database.")
    print("   🎯 Your frontend should show all these students. If not, check:")
    print("      1. Frontend console for errors (F12)")
    print("      2. Network tab to see API response")
    print("      3. Refresh frontend with Ctrl+Shift+R")
else:
    print(f"   ⚠️ Only {total_backend} students in database. Run data generation script:")
    print("      python generate_school_data_fixed.py")

print("\n" + "=" * 70)
print("✅ VERIFICATION COMPLETE")
print("=" * 70)
