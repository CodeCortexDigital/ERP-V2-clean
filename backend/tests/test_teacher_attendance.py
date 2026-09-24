import pytest
from datetime import date
from django.utils import timezone
from rest_framework import status
from services.education.academics.models import Teacher, TeacherAttendance
from services.education.academics.views import ensure_teacher_attendance_for_past_days

pytestmark = pytest.mark.django_db

def test_ensure_teacher_attendance_for_past_days():
    # Create a teacher
    teacher = Teacher.objects.create(
        employee_id="T1001",
        full_name="Dr. John Doe",
        email="john.doe@school.edu",
        phone="1234567890",
        joining_date=date(2026, 1, 1),
        is_active=True
    )
    
    # Run generation for a Sunday date (June 14, 2026 is a Sunday)
    test_date = date(2026, 6, 14)
    ensure_teacher_attendance_for_past_days(str(teacher.id), test_date, days_limit=10)
    
    # In 10 days up to June 14, 2026:
    # June 14 (Sun) - No
    # June 13 (Sat) - No
    # June 12 (Fri) - Yes
    # June 11 (Thu) - Yes
    # June 10 (Wed) - Yes
    # June 9 (Tue) - Yes
    # June 8 (Mon) - Yes
    # June 7 (Sun) - No
    # June 6 (Sat) - No
    # June 5 (Fri) - Yes
    # June 4 (Thu) - Yes
    # Total school days = 7
    
    records = TeacherAttendance.objects.filter(teacher=teacher).order_by('date')
    assert records.count() == 7
    
    # Verify weekends are not in records
    for record in records:
        assert record.date.weekday() not in (5, 6) # Not Saturday or Sunday
        assert record.status == 'present'
        assert record.reason == 'Auto-marked present'

def test_teacher_attendance_list_view(authenticated_api_client):
    client, user = authenticated_api_client
    from services.core.tenants.models import TenantMembership
    from tests.conftest import SchoolFactory
    school = SchoolFactory()
    TenantMembership.objects.create(user=user, school=school, role='admin', is_primary=True)

    # Create a teacher in the admin's school
    teacher = Teacher.objects.create(
        tenant=school,
        employee_id="T1002",
        full_name="Prof. Jane Smith",
        email="jane.smith@school.edu",
        phone="9876543210",
        joining_date=date(2026, 1, 1),
        is_active=True
    )
    
    # View query should trigger auto-generation
    url = f"/api/v1/auth/academics/teacher-attendance/?teacher_id={teacher.id}"
    
    response = client.get(url)
    assert response.status_code == status.HTTP_200_OK
    
    # Verify database has generated records
    records_count = TeacherAttendance.objects.filter(teacher=teacher).count()
    assert records_count > 0
