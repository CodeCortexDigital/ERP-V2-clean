"""Portal logins: no auth backdoor, per-user generated passwords that work at the login endpoint."""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import PortalCredential
from tests.conftest import SchoolFactory, StudentFactory, TeacherFactory, UserFactory

LOGIN_URL = "/api/v1/auth/login/"


def _client_for(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
    return client


def _login(identifier, password):
    return APIClient().post(LOGIN_URL, {"user_id": identifier, "password": password}, format="json")


@pytest.fixture
def admin():
    return UserFactory(is_superuser=True, is_staff=True)


@pytest.mark.django_db
def test_mock_token_is_not_accepted(admin):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Bearer mock-access-token")
    assert client.get("/api/v1/auth/me/").status_code == 401


@pytest.mark.django_db
def test_new_student_gets_own_password_that_logs_in(admin):
    student = StudentFactory()
    creds = _client_for(admin).get(f"/api/v1/auth/credentials/student/{student.pk}/").data

    assert creds["student"]["username"] == student.student_id
    password = creds["student"]["password"]
    assert password and password != "student123"
    assert _login(student.student_id, password).status_code == 200
    assert _login(student.student_id, "student123").status_code == 401

    parent = creds["parent"]
    assert parent and parent["password"] and parent["password"] != "parent123"
    assert _login(parent["username"], parent["password"]).status_code == 200


@pytest.mark.django_db
def test_new_teacher_logs_in_with_employee_id_and_issued_password(admin):
    teacher = TeacherFactory()
    staff = _client_for(admin).get(f"/api/v1/auth/credentials/teacher/{teacher.pk}/").data["staff"]

    assert staff["username"] == teacher.employee_id
    assert _login(teacher.employee_id, staff["password"]).status_code == 200
    assert _login(teacher.employee_id, "teacher123").status_code == 401


@pytest.mark.django_db
def test_only_admins_can_read_credentials():
    student = StudentFactory()
    other_student = StudentFactory()
    student_user = PortalCredential.objects.get(user__email=student.email).user
    res = _client_for(student_user).get(f"/api/v1/auth/credentials/student/{other_student.pk}/")
    assert res.status_code == 403


@pytest.mark.django_db
def test_reset_issues_new_password_and_old_one_stops_working(admin):
    student = StudentFactory()
    client = _client_for(admin)
    old = client.get(f"/api/v1/auth/credentials/student/{student.pk}/").data["student"]["password"]

    new = client.post(f"/api/v1/auth/credentials/student/{student.pk}/reset/?who=student").data["student"]["password"]

    assert new and new != old
    assert _login(student.student_id, old).status_code == 401
    assert _login(student.student_id, new).status_code == 200


@pytest.mark.django_db
def test_changing_own_password_hides_issued_one(admin):
    student = StudentFactory()
    cred = PortalCredential.objects.get(user__email=student.email)
    client = _client_for(cred.user)

    res = client.post("/api/v1/auth/settings/change-password/",
                      {"old_password": cred.initial_password, "new_password": "Stronger#Pass2026"}, format="json")

    assert res.status_code == 200
    detail = _client_for(admin).get(f"/api/v1/auth/credentials/student/{student.pk}/").data["student"]
    assert detail["password"] is None and detail["status"] == "changed_by_user"
    assert _login(student.student_id, "Stronger#Pass2026").status_code == 200


@pytest.mark.django_db
def test_legacy_default_password_is_rotated_when_viewed(admin):
    student = StudentFactory()
    user = PortalCredential.objects.get(user__email=student.email).user
    PortalCredential.objects.filter(user=user).delete()
    user.set_password("student123")
    user.save()

    listed = _client_for(admin).get("/api/v1/auth/credentials/students/").data["results"][str(student.pk)]
    assert listed["student"]["status"] == "not_issued"

    detail = _client_for(admin).get(f"/api/v1/auth/credentials/student/{student.pk}/").data["student"]
    assert detail["password"] and detail["password"] != "student123"
    assert _login(student.student_id, "student123").status_code == 401


@pytest.mark.django_db
def test_admin_only_sees_own_school(admin):
    mine, other = SchoolFactory(), SchoolFactory()
    from services.core.tenants.models import TenantMembership
    school_admin = UserFactory(is_staff=True)
    TenantMembership.objects.create(user=school_admin, school=mine, role="admin", is_primary=True)
    foreign = StudentFactory(tenant=other)

    res = _client_for(school_admin).get(f"/api/v1/auth/credentials/student/{foreign.pk}/")
    assert res.status_code == 404
