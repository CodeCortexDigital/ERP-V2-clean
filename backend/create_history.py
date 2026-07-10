# backend/create_history.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from services.education.students.models import Student
from services.core.audit.models import AuditLog
from services.core.accounts.models import User
from datetime import datetime, timedelta

def create_student_history():
    # Get the student
    try:
        student = Student.objects.get(student_id='4444')
        print(f"✅ Found student: {student.full_name} (ID: {student.id})")
    except Student.DoesNotExist:
        print("❌ Student with ID '4444' not found!")
        return

    # Get a user
    user = User.objects.first()
    if not user:
        print("❌ No user found!")
        return

    print(f"User: {user.email} (ID: {user.id})")

    # Delete any existing logs for this student
    deleted = AuditLog.objects.filter(resource_type='Student', resource_id=str(student.id)).delete()
    print(f"🗑️ Deleted {deleted[0]} existing logs")

    # Create sample history entries
    actions_data = [
        {
            'action': 'created',
            'new_data': {'status': 'active', 'admission_date': '2024-01-15'}
        },
        {
            'action': 'profile_updated',
            'new_data': {'field': 'phone', 'new_value': '0987654321'},
            'old_data': {'field': 'phone', 'old_value': '1234567890'}
        },
        {
            'action': 'attendance_marked',
            'new_data': {'status': 'present', 'date': '2024-01-20'}
        },
        {
            'action': 'fee_payment',
            'new_data': {'amount': 5000, 'month': 'January 2024'}
        },
        {
            'action': 'exam_result',
            'new_data': {'subject': 'Mathematics', 'grade': 'A', 'marks': 85}
        },
        {
            'action': 'note_added',
            'new_data': {'note': 'Student is showing excellent progress'}
        },
        {
            'action': 'class_promotion',
            'new_data': {'to_class': 'Grade 2A'},
            'old_data': {'from_class': 'Grade 1A'}
        },
        {
            'action': 'fee_payment',
            'new_data': {'amount': 3000, 'month': 'February 2024'}
        },
        {
            'action': 'exam_result',
            'new_data': {'subject': 'English', 'grade': 'B+', 'marks': 78}
        },
        {
            'action': 'attendance_marked',
            'new_data': {'status': 'absent', 'date': '2024-02-01'}
        },
    ]

    created_count = 0
    for i, action_data in enumerate(actions_data):
        try:
            AuditLog.objects.create(
                user=user,
                action=action_data['action'],
                resource_type='Student',
                resource_id=str(student.id),
                new_data=action_data.get('new_data', {}),
                old_data=action_data.get('old_data', {}),
                timestamp=datetime.now() - timedelta(days=i*2),
                ip_address='127.0.0.1',
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            created_count += 1
            print(f"✅ {created_count}. {action_data['action']}")
        except Exception as e:
            print(f"❌ Error: {e}")

    print(f"\n🎉 Created {created_count} history records for {student.full_name}!")

    # Verify
    logs = AuditLog.objects.filter(resource_type='Student', resource_id=str(student.id))
    print(f"\n📊 Total records in database: {logs.count()}")
    for log in logs.order_by('-timestamp')[:5]:
        print(f"  - {log.timestamp.strftime('%Y-%m-%d %H:%M')}: {log.action}")

if __name__ == '__main__':
    create_student_history()