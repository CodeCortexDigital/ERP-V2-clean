import pytest
from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from tests.conftest import UserFactory, TeacherFactory
from services.education.academics.models import TeacherLeave
from django.contrib.auth import get_user_model

pytestmark = [pytest.mark.django_db]

class TestLeaveApprovalPermissions:
    @pytest.fixture
    def setup_leave(self):
        User = get_user_model()
        
        # Create a teacher (which auto-creates a User via signals)
        self.teacher = TeacherFactory()
        
        # Retrieve the auto-created User
        self.teacher_user = User.objects.get(email=self.teacher.email)
        self.teacher_user.is_staff = False
        self.teacher_user.is_superuser = False
        self.teacher_user.save()
        
        # Create another user representing an admin
        self.admin_user = UserFactory(
            is_staff=True,
            is_superuser=True
        )
        
        # Create a manager user
        self.manager_user = UserFactory(
            is_staff=False,
            is_superuser=False
        )
        
        # Setup manager role
        from django.apps import apps
        try:
            RoleModel = apps.get_model('rbac_models', 'Role')
            UserProfileModel = apps.get_model('core_accounts', 'UserProfile')
            manager_role, _ = RoleModel.objects.get_or_create(name='manager')
            UserProfileModel.objects.get_or_create(user=self.manager_user, defaults={'role': manager_role})
        except Exception as e:
            print(f"Error setting up manager: {e}")

        # Create a leave request for the teacher
        self.leave = TeacherLeave.objects.create(
            teacher=self.teacher,
            applicant_name=self.teacher.full_name,
            applicant_email=self.teacher.email,
            leave_type='sick',
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timezone.timedelta(days=2),
            reason='Medical reasons',
            status='pending'
        )

    def test_admin_can_approve_leave(self, setup_leave, api_client):
        """Test that an admin user can approve a leave request."""
        api_client.force_authenticate(user=self.admin_user)
        url = f"/api/auth/academics/teacher-leaves/{self.leave.id}/"
        response = api_client.patch(url, {'status': 'approved'}, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        self.leave.refresh_from_db()
        assert self.leave.status == 'approved'

    def test_manager_can_approve_leave(self, setup_leave, api_client):
        """Test that a manager/HR role user can approve a leave request."""
        api_client.force_authenticate(user=self.manager_user)
        url = f"/api/auth/academics/teacher-leaves/{self.leave.id}/"
        response = api_client.patch(url, {'status': 'approved'}, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        self.leave.refresh_from_db()
        assert self.leave.status == 'approved'

    def test_employee_cannot_approve_own_leave(self, setup_leave, api_client):
        """Test that a regular teacher/employee cannot approve their own leave."""
        api_client.force_authenticate(user=self.teacher_user)
        url = f"/api/auth/academics/teacher-leaves/{self.leave.id}/"
        response = api_client.patch(url, {'status': 'approved'}, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        self.leave.refresh_from_db()
        assert self.leave.status == 'pending'

    def test_employee_cannot_approve_other_leave(self, setup_leave, api_client):
        """Test that a regular teacher/employee cannot approve another teacher's leave."""
        # Create another teacher and leave
        other_teacher = TeacherFactory()
        other_leave = TeacherLeave.objects.create(
            teacher=other_teacher,
            applicant_name=other_teacher.full_name,
            applicant_email=other_teacher.email,
            leave_type='casual',
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timezone.timedelta(days=1),
            status='pending'
        )
        
        api_client.force_authenticate(user=self.teacher_user)
        url = f"/api/auth/academics/teacher-leaves/{other_leave.id}/"
        
        response = api_client.patch(url, {'status': 'approved'}, format='json')
        assert response.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST)
        other_leave.refresh_from_db()
        assert other_leave.status == 'pending'

    def test_employee_can_cancel_own_leave(self, setup_leave, api_client):
        """Test that a teacher can cancel their own leave request."""
        api_client.force_authenticate(user=self.teacher_user)
        url = f"/api/auth/academics/teacher-leaves/{self.leave.id}/"
        response = api_client.patch(url, {'status': 'cancelled'}, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        self.leave.refresh_from_db()
        assert self.leave.status == 'cancelled'
