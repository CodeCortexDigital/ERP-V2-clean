import django
import os
import uuid
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps

try:
    Applicant = apps.get_model('education_admissions', 'Applicant')
    print('✅ Applicant model found')
    
    # Delete existing applicants
    deleted = Applicant.objects.all().delete()[0]
    print(f'🗑️ Deleted {deleted} existing applicants')
    print('')
    
    # Create sample applicants
    applicants_data = [
        ('Ahmed', 'Khan', 'ahmed.khan@example.com', '03001234567', 'Grade 1', 'new', 'male'),
        ('Fatima', 'Ali', 'fatima.ali@example.com', '03001234568', 'Grade 1', 'reviewed', 'female'),
        ('Omar', 'Hassan', 'omar.hassan@example.com', '03001234569', 'Computer Science', 'accepted', 'male'),
        ('Zainab', 'Malik', 'zainab.malik@example.com', '03001234570', 'Business Administration', 'new', 'female'),
        ('Bilal', 'Ahmed', 'bilal.ahmed@example.com', '03001234571', 'Grade 2', 'accepted', 'male'),
        ('Sara', 'Chaudhry', 'sara.c@example.com', '03001234572', 'Grade 1', 'reviewed', 'female'),
        ('Usman', 'Raza', 'usman.r@example.com', '03001234573', 'Computer Science', 'new', 'male'),
        ('Hina', 'Shah', 'hina.shah@example.com', '03001234574', 'Business Administration', 'accepted', 'female'),
    ]
    
    created = 0
    for first, last, email, phone, program, status, gender in applicants_data:
        Applicant.objects.create(
            applicant_id=f'APP{str(uuid.uuid4())[:8].upper()}',
            first_name=first,
            last_name=last,
            email=email,
            phone=phone,
            applying_for=program,
            status=status,
            gender=gender,
            city='Karachi',
            country='Pakistan',
            previous_institution='Sample School',
            previous_qualification='Previous Level',
            previous_percentage=85.0,
            date_of_birth=datetime.now().date() - timedelta(days=365*10)
        )
        created += 1
        print(f'   ✅ Created: {first} {last} - {status}')
    
    print('')
    print('=' * 50)
    print('📊 SAMPLE APPLICANTS CREATED:')
    print('=' * 50)
    
    total = Applicant.objects.count()
    new_count = Applicant.objects.filter(status='new').count()
    reviewed_count = Applicant.objects.filter(status='reviewed').count()
    accepted_count = Applicant.objects.filter(status='accepted').count()
    enrolled_count = Applicant.objects.filter(status='enrolled').count()
    
    print(f'   Total: {total}')
    print(f'   New: {new_count}')
    print(f'   Reviewed: {reviewed_count}')
    print(f'   Accepted: {accepted_count}')
    print(f'   Enrolled: {enrolled_count}')
    print('=' * 50)
    
    if total > 0:
        print('')
        print('✅ Sample applicants created successfully!')
    else:
        print('')
        print('⚠️ No applicants were created')
    
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
