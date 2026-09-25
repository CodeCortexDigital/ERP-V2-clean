"""School staff who are not teachers (bus crew, cafeteria cashiers, office helpers) get the 'staff' role (Phase 17 fix)."""
import pytest

from services.core.accounts.decorators import get_user_role
from services.core.accounts.models import ParentProfile
from services.core.tenants.models import TenantMembership
from tests.conftest import SchoolFactory, UserFactory


@pytest.mark.django_db
def test_staff_membership_gives_the_staff_role():
    s = SchoolFactory()
    cashier = UserFactory(email='canteen@school.test')
    TenantMembership.objects.create(user=cashier, school=s, role='staff', is_primary=True)
    accountant = UserFactory(email='books@school.test')
    TenantMembership.objects.create(user=accountant, school=s, role='accountant', is_primary=True)
    nobody = UserFactory(email='nobody@example.com')
    left = UserFactory(email='left@school.test')
    TenantMembership.objects.create(user=left, school=s, role='staff', is_active=False)
    assert get_user_role(cashier) == 'staff'
    assert get_user_role(accountant) == 'staff'
    assert get_user_role(nobody) is None
    assert get_user_role(left) is None  # an inactive membership gives nothing
    # Other roles still win: a parent who is also staff is a parent; an admin stays admin.
    ParentProfile.objects.create(user=cashier)
    assert get_user_role(cashier) == 'parent'
    TenantMembership.objects.create(user=accountant, school=SchoolFactory(), role='admin')
    assert get_user_role(accountant) == 'admin'
