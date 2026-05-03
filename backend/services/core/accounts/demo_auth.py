from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import uuid
from django.apps import apps

User = get_user_model()

class DemoAccountService:
    """Handle demo/guest account creation with expiry"""
    
    DEMO_EXPIRY_DAYS = 7  # Demo accounts expire after 7 days
    
    @classmethod
    def create_demo_tenant(cls, name, email):
        """Create a demo tenant/school"""
        # Create tenant (if multi-tenant model exists)
        Tenant = None
        try:
            Tenant = apps.get_model('core_accounts', 'Tenant')
        except:
            pass
        
        tenant_id = f"demo_{uuid.uuid4().hex[:8]}"
        
        if Tenant:
            tenant = Tenant.objects.create(
                name=f"Demo School - {name}",
                subdomain=tenant_id,
                is_active=True,
                settings={
                    'is_demo': True,
                    'demo_expiry': (timezone.now() + timedelta(days=cls.DEMO_EXPIRY_DAYS)).isoformat(),
                    'demo_created_by': email
                }
            )
        else:
            tenant = None
            tenant_id = tenant_id
        
        return tenant_id, tenant
    
    @classmethod
    def create_demo_data(cls, tenant_id, user):
        """Create sample data for demo account"""
        # Import models
        Student = apps.get_model('education_students', 'Student')
        Course = apps.get_model('education_academics', 'Course')
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        Section = apps.get_model('education_academics', 'Section')
        
        # Create sample classes
        classes = []
        class_names = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5']
        for class_name in class_names:
            school_class = SchoolClass.objects.create(
                name=class_name,
                code=f"CLS_{class_name.replace(' ', '_')}",
                capacity=30,
                is_active=True,
                tenant_id=tenant_id
            )
            classes.append(school_class)
            
            # Create sections for each class
            for sec_name in ['A', 'B']:
                Section.objects.create(
                    class_ref=school_class,
                    name=sec_name,
                    code=f"{school_class.code}_{sec_name}",
                    capacity=15,
                    is_active=True,
                    tenant_id=tenant_id
                )
        
        # Create sample courses
        sample_courses = [
            ('MATH101', 'Mathematics', 4),
            ('ENG101', 'English', 3),
            ('SCI101', 'Science', 4),
            ('HIS101', 'History', 2),
        ]
        for code, name, credits in sample_courses:
            Course.objects.create(
                code=code,
                name=name,
                credits=credits,
                is_active=True,
                tenant_id=tenant_id
            )
        
        # Create sample students (10-20)
        sample_students = [
            ('Ahmed Khan', 'ahmed.demo@example.com', '+923001234567'),
            ('Fatima Ali', 'fatima.demo@example.com', '+923001234568'),
            ('Omar Hassan', 'omar.demo@example.com', '+923001234569'),
            ('Zainab Malik', 'zainab.demo@example.com', '+923001234570'),
            ('Bilal Ahmed', 'bilal.demo@example.com', '+923001234571'),
            ('Ayesha Siddiqui', 'ayesha.demo@example.com', '+923001234572'),
            ('Hamza Ali', 'hamza.demo@example.com', '+923001234573'),
            ('Sara Ahmed', 'sara.demo@example.com', '+923001234574'),
            ('Usman Khan', 'usman.demo@example.com', '+923001234575'),
            ('Iqra Aslam', 'iqra.demo@example.com', '+923001234576'),
        ]
        
        created_students = []
        for idx, (name, email, phone) in enumerate(sample_students):
            student_id = f"DEMO{str(idx+1).zfill(3)}"
            student = Student.objects.create(
                student_id=student_id,
                full_name=name,
                email=email,
                phone=phone,
                is_active=True,
                tenant_id=tenant_id,
                enrollment_date=timezone.now().date()
            )
            created_students.append(student)
        
        return {
            'students_count': len(created_students),
            'classes_count': len(classes),
            'courses_count': len(sample_courses)
        }
    
    @classmethod
    def create_demo_user(cls, email, name=None):
        """Create demo user account"""
        if not name:
            name = email.split('@')[0]
        
        # Check if user already exists
        existing_user = User.objects.filter(email=email).first()
        if existing_user:
            return existing_user
        
        # Create demo user
        username = f"demo_{uuid.uuid4().hex[:8]}"
        user = User.objects.create(
            email=email,
            full_name=f"Demo User - {name}",
            is_active=True,
            account_status='active',
            is_staff=False,
            is_superuser=False
        )
        
        # Mark as demo user (custom field if exists, otherwise use metadata)
        user.demo_account = True
        user.demo_expiry = timezone.now() + timedelta(days=cls.DEMO_EXPIRY_DAYS)
        
        return user
    
    @classmethod
    def is_demo_valid(cls, user):
        """Check if demo account is still valid (not expired)"""
        if hasattr(user, 'demo_expiry'):
            return user.demo_expiry > timezone.now()
        return True
    
    @classmethod
    def get_demo_remaining_days(cls, user):
        """Get remaining days for demo account"""
        if hasattr(user, 'demo_expiry'):
            remaining = (user.demo_expiry - timezone.now()).days
            return max(0, remaining)
        return cls.DEMO_EXPIRY_DAYS
