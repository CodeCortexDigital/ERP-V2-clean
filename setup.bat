@echo off
echo ========================================
echo ERP V2 - Fresh Installation Setup
echo ========================================
echo.

echo [1/6] Creating virtual environment...
cd backend
python -m venv venv
call venv\Scripts\activate

echo [2/6] Installing backend dependencies...
pip install -r requirements.txt

echo [3/6] Running migrations...
python manage.py makemigrations
python manage.py migrate

echo [4/6] Creating superuser...
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(email='admin@code.com').exists() or User.objects.create_superuser('admin@code.com', 'admin123')"

echo [5/6] Loading sample data...
python manage.py shell -c "
from services.education.academics.models import SchoolClass, Section, AcademicYear
from services.education.students.models import Student
from django.utils import timezone
import uuid

# Create Academic Year
year, _ = AcademicYear.objects.get_or_create(name='2026-2027', defaults={'start_date': '2026-04-01', 'end_date': '2027-03-31', 'is_current': True})

# Create Classes
for i, name in enumerate(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'], 1):
    cls, _ = SchoolClass.objects.get_or_create(code=f'GRD0{i}', defaults={'name': name, 'capacity': 30, 'academic_year': year, 'is_active': True})
    for sec in ['A', 'B']:
        Section.objects.get_or_create(class_ref=cls, code=f'GRD0{i}_{sec}', defaults={'name': sec, 'capacity': 15, 'is_active': True})

print('Sample data loaded!')
"

echo [6/6] Starting backend server...
python manage.py runserver

echo.
echo Backend running on http://localhost:8000
echo.
echo In a NEW terminal, run: cd frontend && npm install && npm run dev
