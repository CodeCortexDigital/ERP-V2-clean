"""
Global pytest configuration and fixtures for ERP testing.
"""
import os
import django
from django.conf import settings
import pytest
from django.test import Client
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import factory
from factory import fuzzy
from faker import Faker


# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()


fake = Faker()


# ============================================================================
# FACTORY DEFINITIONS
# ============================================================================

class UserFactory(factory.django.DjangoModelFactory):
    """Factory for creating test User objects."""
    class Meta:
        model = settings.AUTH_USER_MODEL
    
    email = factory.Faker('email')
    full_name = factory.Faker('name')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_active = True
    account_status = 'active'
    
    @classmethod
    def create(cls, **kwargs):
        """Override to set password if provided."""
        username = kwargs.pop('username', None)
        if username is not None:
            kwargs.setdefault('email', f'{username}@example.com')
            kwargs.setdefault('full_name', username)

        password = kwargs.pop('password', 'testpass123')
        user = super().create(**kwargs)
        user.set_password(password)
        user.save()
        return user


def _generate_tenant_code(n):
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    c1 = chars[n % 26]
    c2 = chars[(n // 26) % 26]
    c3 = chars[(n // 676) % 26]
    return f"{c3}{c2}{c1}"

class SchoolFactory(factory.django.DjangoModelFactory):
    """Factory for creating test School objects."""
    class Meta:
        model = 'core_tenants.School'
    
    name = factory.Faker('company')
    tenant_code = factory.Sequence(_generate_tenant_code)
    subdomain = factory.Sequence(lambda n: f'school{n}')
    is_active = True


class ClassFactory(factory.django.DjangoModelFactory):
    """Factory for creating test Class objects."""
    class Meta:
        model = 'education_academics.SchoolClass'
    
    name = factory.Sequence(lambda n: f'Class {n + 1}')
    code = factory.Sequence(lambda n: f'CLS{n:03d}')
    school = factory.SubFactory(SchoolFactory)


class SectionFactory(factory.django.DjangoModelFactory):
    """Factory for creating test Section objects."""
    class Meta:
        model = 'education_academics.Section'
    
    name = factory.Sequence(lambda n: f'Section {chr(65 + n)}')  # A, B, C...
    class_obj = factory.SubFactory(ClassFactory)


class StudentFactory(factory.django.DjangoModelFactory):
    """Factory for creating test Student objects."""
    class Meta:
        model = 'education_students.Student'
    
    student_id = factory.Sequence(lambda n: f'STU{n:06d}')
    full_name = factory.Faker('name')
    email = factory.LazyAttribute(lambda obj: f"{obj.full_name.lower().replace(' ', '.')}@example.com")
    phone = factory.Sequence(lambda n: f'+1555555{n:04d}')
    date_of_birth = factory.Faker('date_of_birth', minimum_age=5, maximum_age=18)
    admission_date = factory.Faker('date_this_decade')
    gender = 'male'
    guardian_name = factory.Faker('name')
    emergency_contact = factory.Sequence(lambda n: f'+1555555{n:04d}')
    father_name = factory.Faker('name')
    mother_name = factory.Faker('name')
    guardian_phone = factory.Sequence(lambda n: f'+1555555{n:04d}')
    address = factory.Faker('address')
    city = factory.Faker('city')
    state = factory.Faker('state')
    postal_code = factory.Faker('postcode')
    current_class = factory.SubFactory(ClassFactory)
    current_section = factory.SubFactory(SectionFactory)
    is_active = True


class TeacherFactory(factory.django.DjangoModelFactory):
    """Factory for creating test Teacher objects."""
    class Meta:
        model = 'education_academics.Teacher'
    
    school = factory.SubFactory(SchoolFactory)
    employee_id = factory.Sequence(lambda n: f'TEA{n:05d}')
    full_name = factory.Faker('name')
    email = factory.Faker('email')
    qualifications = ['Bachelor']
    experience_years = fuzzy.FuzzyInteger(0, 20)
    joining_date = factory.Faker('date_this_decade')
    is_active = True


class AttendanceRecordFactory(factory.django.DjangoModelFactory):
    """Factory for creating test AttendanceRecord objects."""
    class Meta:
        model = 'education_attendance.AttendanceRecord'
    
    student = factory.SubFactory(StudentFactory)
    date = factory.Faker('date_this_month')
    status = fuzzy.FuzzyChoice(['present', 'absent', 'leave'])
    marked_by = factory.SubFactory(UserFactory)
    remarks = ''


class ExamFactory(factory.django.DjangoModelFactory):
    """Factory for creating test Exam objects."""
    class Meta:
        model = 'education_exams.Exam'
    
    name = factory.Faker('word')
    school = factory.SubFactory(SchoolFactory)
    class_obj = factory.SubFactory(ClassFactory, school=factory.SelfAttribute('..school'))
    exam_type = fuzzy.FuzzyChoice(['midterm', 'final', 'quiz', 'assignment'])
    start_date = factory.Faker('date_this_month')
    end_date = factory.Faker('date_this_month')
    is_active = True


class ExamResultFactory(factory.django.DjangoModelFactory):
    """Factory for creating test ExamResult objects."""
    class Meta:
        model = 'education_exams.ExamResult'
    
    exam = factory.SubFactory(ExamFactory)
    student = factory.SubFactory(StudentFactory)
    total_marks = 100
    obtained_marks = fuzzy.FuzzyInteger(0, 100)
    percentage = factory.LazyAttribute(lambda o: (o.obtained_marks / o.total_marks * 100))
    grade = fuzzy.FuzzyChoice(['A', 'B', 'C', 'D', 'F'])
    status = 'published'
    remarks = ''


class InvoiceFactory(factory.django.DjangoModelFactory):
    """Factory for creating test Invoice objects."""
    class Meta:
        model = 'education_finance.Invoice'
    
    student = factory.SubFactory(StudentFactory)
    invoice_number = factory.Sequence(lambda n: f'INV{n:06d}')
    due_date = factory.Faker('date_this_month')
    amount = fuzzy.FuzzyDecimal(1000, 50000)
    paid_amount = 0
    status = fuzzy.FuzzyChoice(['pending', 'partial', 'paid', 'overdue'])
    description = 'Monthly tuition fee'


class NotificationFactory(factory.django.DjangoModelFactory):
    """Factory for creating test Notification objects."""
    class Meta:
        model = 'user_notifications.Notification'
    
    recipient = factory.SubFactory(UserFactory)
    title = factory.Faker('sentence', nb_words=4)
    message = factory.Faker('text', max_nb_chars=200)
    notification_type = fuzzy.FuzzyChoice(['attendance', 'fee', 'exam', 'announcement'])
    is_read = False
    created_at = factory.Faker('date_time_this_month')


# ============================================================================
# PYTEST FIXTURES
# ============================================================================

@pytest.fixture
def api_client():
    """Fixture to provide API client."""
    return APIClient()


@pytest.fixture
def authenticated_api_client():
    """Fixture to provide authenticated API client."""
    client = APIClient()
    user = UserFactory()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client, user


@pytest.fixture
def test_user():
    """Fixture to provide a test user."""
    return UserFactory(username='testuser', password='testpass123')


@pytest.fixture
def test_school():
    """Fixture to provide a test school."""
    return SchoolFactory()


@pytest.fixture
def test_class(test_school):
    """Fixture to provide a test class."""
    return ClassFactory(school=test_school)


@pytest.fixture
def test_section(test_class):
    """Fixture to provide a test section."""
    return SectionFactory(class_obj=test_class)


@pytest.fixture
def test_student(test_school, test_class, test_section):
    """Fixture to provide a test student."""
    return StudentFactory(
        school=test_school,
        class_obj=test_class,
        section=test_section
    )


@pytest.fixture
def test_teacher(test_school):
    """Fixture to provide a test teacher."""
    return TeacherFactory(school=test_school)


@pytest.fixture
def test_exam(test_school, test_class):
    """Fixture to provide a test exam."""
    return ExamFactory(school=test_school, class_obj=test_class)


@pytest.fixture
def test_exam_result(test_exam, test_student):
    """Fixture to provide a test exam result."""
    return ExamResultFactory(exam=test_exam, student=test_student)


@pytest.fixture
def test_invoice(test_student):
    """Fixture to provide a test invoice."""
    return InvoiceFactory(student=test_student)


@pytest.fixture
def test_attendance_record(test_student):
    """Fixture to provide a test attendance record."""
    return AttendanceRecordFactory(student=test_student)


@pytest.fixture
def test_notification(test_user):
    """Fixture to provide a test notification."""
    return NotificationFactory(recipient=test_user)


# ============================================================================
# PYTEST CONFIGURATION
# ============================================================================

@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    """Configure database for tests."""
    with django_db_blocker.unblock():
        pass


@pytest.fixture(scope="session")
def django_db_modify_db_settings():
    """Modify database settings for tests."""
    settings.DATABASES['default']['NAME'] = 'test_erp_db'


def pytest_configure(config):
    """Configure pytest."""
    settings.DEBUG = False
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
