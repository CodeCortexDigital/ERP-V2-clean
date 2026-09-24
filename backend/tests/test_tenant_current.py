"""/tenants/current/ and /tenants/settings/ resolve the logged-in user's own school."""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.tenants.models import TenantMembership
from tests.conftest import SchoolFactory, UserFactory


def _client_for(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
    return client


@pytest.mark.django_db
def test_current_tenant_uses_membership_not_first_school():
    SchoolFactory(name="Some Other School")  # would win a "first active school" fallback
    mine = SchoolFactory(name="My School", settings_json={"institute_name": "My School"})
    user = UserFactory()
    TenantMembership.objects.create(user=user, school=mine, role="admin", is_primary=True)

    res = _client_for(user).get("/api/v1/tenants/current/")

    assert res.status_code == 200
    assert res.data["tenant"]["name"] == "My School"


@pytest.mark.django_db
def test_student_without_membership_gets_school_from_student_record():
    from services.core.accounts.models import User
    from tests.conftest import StudentFactory

    SchoolFactory(name="Some Other School")
    mine = SchoolFactory(name="My School")
    student = StudentFactory(tenant=mine)
    user = User.objects.get(email=student.email)  # created by the Student signal

    res = _client_for(user).get("/api/v1/tenants/current/")

    assert res.data["tenant"]["name"] == "My School"


@pytest.mark.django_db
def test_tenant_settings_read_and_save_hit_users_school():
    other = SchoolFactory(name="Some Other School", settings_json={})
    mine = SchoolFactory(name="My School", settings_json={"institute_name": "My School"})
    user = UserFactory()
    TenantMembership.objects.create(user=user, school=mine, role="admin", is_primary=True)
    client = _client_for(user)

    assert client.get("/api/v1/tenants/settings/").data["institute_name"] == "My School"

    client.put("/api/v1/tenants/settings/", {"phone": "042-111"}, format="json")
    mine.refresh_from_db()
    other.refresh_from_db()
    assert mine.settings_json["phone"] == "042-111"
    assert "phone" not in other.settings_json
