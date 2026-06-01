# RBAC Vulnerability Remediation Implementation Guide

**Status:** 🚨 CRITICAL - Implement Immediately  
**Severity:** CRITICAL  
**Timeline:** Phase 1 (Immediate) - 3 days  

---

## Quick Summary

Your ERP system has **critical RBAC vulnerabilities** allowing all users (student, teacher, parent) to have the same access as admin:

1. **JWT Role Injection** - Attackers can modify tokens to claim admin role
2. **is_staff Flag Misuse** - Any staff user becomes admin
3. **Unprotected Webhooks** - Anyone can inject messages
4. **Missing Finance Checks** - Students can create fake invoices
5. **AllowAny Endpoints** - Multiple open authentication endpoints

**Impact:** Privilege escalation, unauthorized financial access, data breaches

---

## Phase 1: Critical Fixes (Do This First - 3 Days)

### Step 1: Fix JWT Role Injection ⚠️ CRITICAL

**Files to Update:**
- `backend/services/education/students/authentication.py`
- `backend/services/education/academics/authentication.py`

**What to Change:**

BEFORE (Line ~52, 67):
```python
user_role = payload.get('role', 'user')  # Don't do this!
# ...
user.role = user_role  # This is the vulnerability
```

AFTER:
```python
# REMOVE THESE LINES COMPLETELY
# Don't assign role from JWT payload
# Role will be determined server-side only
```

**Why:** Clients can modify JWT tokens to claim admin role. Server must compute role from database only.

**Testing:**
```bash
# Login as student
POST /api/auth/login/
{
    "email": "student@example.com",
    "password": "password"
}
# Get token from response

# Try to access admin endpoints with student token
GET /api/admin/students/
# BEFORE: Works (VULNERABILITY)
# AFTER: 403 Forbidden
```

---

### Step 2: Fix is_staff as Admin Indicator

**File:** `backend/services/core/accounts/decorators.py` (Line 17-19)

**What to Change:**

BEFORE:
```python
def get_user_role(user):
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return 'admin'  # BAD: is_staff grants admin!
```

AFTER:
```python
def get_user_role(user):
    if not getattr(user, 'is_authenticated', False):
        return None

    # ONLY superuser, NOT is_staff
    if getattr(user, 'is_superuser', False):
        return 'admin'
    
    # Remove the is_staff check completely
    # if getattr(user, 'is_staff', False):  ← DELETE THIS LINE
    #     return 'admin'
    
    # ... rest of role checking
```

**Why:** The `is_staff` flag is for Django admin, not API roles. Any staff user would become API admin.

**SQL to Find Affected Users:**
```sql
-- Find users with is_staff=True (will lose admin access after fix)
SELECT id, email, is_staff, is_superuser FROM accounts_user 
WHERE is_staff=True AND is_superuser=False;

-- You need to assign them proper roles:
-- UPDATE accounts_user_profile SET role_id='teacher-role-id' WHERE user_id='...';
```

**Deployment Impact:**
- All `is_staff` users without proper role will lose admin access
- You must assign proper roles to these users BEFORE deploying
- Only `is_superuser` will keep admin access

---

### Step 3: Secure WhatsApp Webhook

**File:** `backend/services/communication/whatsapp/views.py` (Line 15-17)

**What to Change:**

BEFORE:
```python
class WhatsAppWebhookView(APIView):
    authentication_classes = []
    permission_classes = []  # OPEN TO ANYONE!
```

AFTER:
```python
class WhatsAppWebhookView(APIView):
    authentication_classes = []
    permission_classes = []
    
    def post(self, request, *args, **kwargs):
        # Verify webhook signature from WhatsApp
        if not self._verify_webhook_signature(request):
            return Response(
                {'detail': 'Invalid signature'},
                status=status.HTTP_403_FORBIDDEN
            )
        # ... process webhook

    def _verify_webhook_signature(self, request):
        """Verify request came from WhatsApp using HMAC-SHA256"""
        import hmac, hashlib
        
        signature = request.META.get('HTTP_X_HUB_SIGNATURE_256', '')
        if not signature.startswith('sha256='):
            return False
        
        app_secret = settings.WHATSAPP_APP_SECRET
        expected = 'sha256=' + hmac.new(
            app_secret.encode(),
            request.body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected)
```

**Required Settings:**
```python
# Add to settings.py
WHATSAPP_WEBHOOK_VERIFY_TOKEN = os.environ.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN', '')
WHATSAPP_APP_SECRET = os.environ.get('WHATSAPP_APP_SECRET', '')
```

**Environment Variables:**
```bash
# Add to .env file
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token_here
WHATSAPP_APP_SECRET=your_app_secret_here
```

**Testing:**
```bash
# Test with invalid signature
curl -X POST http://localhost:8000/api/whatsapp/webhook/ \
  -H "X-Hub-Signature-256: sha256=invalid" \
  -d '{"data": "test"}'

# Response: 403 Forbidden ✅
```

---

### Step 4: Add Role Checks to Finance Module

**File:** `backend/services/education/finance/views.py`

**What to Change:**

Add this permission class at the top:
```python
from rest_framework.permissions import BasePermission
from services.core.accounts.decorators import get_user_role

class IsFinanceStaffOrAdmin(BasePermission):
    """Only admin and accountant can access finance data"""
    
    def has_permission(self, request, view):
        user_role = get_user_role(request.user)
        return user_role in ['admin', 'accountant']
```

Then update each finance view:

BEFORE:
```python
class InvoiceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]  # ANYONE CAN CREATE!
```

AFTER:
```python
class InvoiceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsFinanceStaffOrAdmin]  # ONLY ACCOUNTANT/ADMIN
```

**Apply to All Finance Views:**
- ❌ FeeStructureListCreateView
- ❌ InvoiceListCreateView
- ❌ PaymentListCreateView
- ❌ InstallmentPlanListCreateView
- ❌ ScholarshipListCreateView
- ❌ LateFeeRuleListCreateView

**Testing:**
```bash
# Try as student
POST /api/finance/invoices/
Headers: Authorization: Bearer <student-token>
{
    "student_id": "other-student",
    "amount": 5000
}

# BEFORE: 201 Created (VULNERABILITY!)
# AFTER: 403 Forbidden ✅
```

---

## Phase 2: Additional Hardening (Week 1-2)

### Step 5: Secure User Creation Endpoints

**Files:**
- `backend/services/core/accounts/google_auth.py`
- `backend/services/core/accounts/firebase_auth.py`

**Issue:** Google/Firebase users are created without roles assigned.

**Fix:**
```python
# BEFORE
user = User.objects.create_user(
    email=email,
    full_name=name,
    # NO ROLE ASSIGNED
)

# AFTER
user = User.objects.create_user(
    email=email,
    full_name=name,
)

# Assign default role
from services.rbac_models.models import Role
try:
    default_role = Role.objects.get(role_type='student')
    # Create user profile with role
    user.profile = UserProfile.objects.create(
        user=user,
        role=default_role
    )
except Role.DoesNotExist:
    logger.warning("Default student role not found")
```

---

### Step 6: Create Role Assignment Workflow

**Database Migration:**

```python
# In migrations:
from django.db import migrations
from services.rbac_models.models import Role

def assign_roles(apps, schema_editor):
    """Assign proper roles to existing users"""
    User = apps.get_model('accounts', 'User')
    UserProfile = apps.get_model('accounts', 'UserProfile')
    Role = apps.get_model('rbac_models', 'Role')
    
    # Find all staff users without roles
    staff_without_role = User.objects.filter(
        is_staff=True,
        is_superuser=False,
        profile__isnull=True
    )
    
    # Assign them teacher role (adjust as needed)
    teacher_role = Role.objects.filter(role_type='teacher').first()
    for user in staff_without_role:
        UserProfile.objects.create(user=user, role=teacher_role)

class Migration(migrations.Migration):
    dependencies = [...]
    operations = [
        migrations.RunPython(assign_roles),
    ]
```

---

## Phase 3: Testing & Validation

### Test Matrix

Create this test file: `backend/tests/test_rbac_fixes.py`

```python
from django.test import TestCase
from rest_framework.test import APIClient
from services.core.accounts.models import User
from services.education.students.models import Student

class RBACVulnerabilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create test users
        self.admin_user = User.objects.create_superuser(
            email='admin@example.com',
            password='password'
        )
        
        self.student_user = User.objects.create_user(
            email='student@example.com',
            password='password'
        )
        Student.objects.create(
            email='student@example.com',
            full_name='Student'
        )
        
        self.teacher_user = User.objects.create_user(
            email='teacher@example.com',
            password='password'
        )
    
    def test_jwt_role_injection_blocked(self):
        """Test that JWT role injection is blocked"""
        # Get student token
        response = self.client.post('/api/auth/login/', {
            'email': 'student@example.com',
            'password': 'password'
        })
        token = response.data['access']
        
        # Try to access finance endpoints
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/finance/invoices/', {
            'student_id': 'other-student',
            'amount': 5000
        })
        
        # Should be forbidden
        self.assertEqual(response.status_code, 403)
    
    def test_is_staff_not_admin(self):
        """Test that is_staff doesn't grant admin access"""
        staff_user = User.objects.create_user(
            email='staff@example.com',
            password='password',
            is_staff=True  # Staff but not superuser
        )
        
        # Staff user should not be admin
        from services.core.accounts.decorators import get_user_role
        role = get_user_role(staff_user)
        self.assertNotEqual(role, 'admin')
    
    def test_finance_role_check(self):
        """Test that finance endpoints require accountant/admin role"""
        # Student should be forbidden
        self.client.force_authenticate(self.student_user)
        response = self.client.post('/api/finance/invoices/', {})
        self.assertEqual(response.status_code, 403)
        
        # Admin should be allowed
        self.client.force_authenticate(self.admin_user)
        response = self.client.get('/api/finance/invoices/')
        self.assertNotEqual(response.status_code, 403)
```

**Run Tests:**
```bash
cd backend
python manage.py test tests.test_rbac_fixes
```

---

## Phase 4: Deployment Steps

### Pre-Deployment Checklist

- [ ] All Phase 1 fixes implemented
- [ ] Code reviewed by security team
- [ ] All tests passing
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Team notified of changes

### Deployment (Low-Risk Approach)

**Step 1: Deploy authentication fix**
```bash
# Deploy JWT and is_staff fixes
git push production
docker-compose restart web
```

**Step 2: Monitor for issues**
- Watch logs for authentication failures
- Check user access patterns
- Monitor API error rates

**Step 3: Deploy finance fixes**
- Deploy role checks
- Test finance endpoints
- Verify only staff can access

**Step 4: Deploy webhook fixes**
- Update WhatsApp configuration
- Test webhook signature verification
- Monitor message delivery

### Rollback Plan

If something breaks:
```bash
# Revert to previous version
git checkout previous-commit
docker-compose restart web

# Check logs
docker-compose logs -f web
```

---

## File Summary

### Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `auth.py` (students) | Remove JWT role | 🔴 Critical |
| `auth.py` (academics) | Remove JWT role | 🔴 Critical |
| `decorators.py` | Remove is_staff check | 🔴 Critical |
| `whatsapp/views.py` | Add signature verification | 🔴 Critical |
| `finance/views.py` | Add role permission classes | 🔴 Critical |
| `google_auth.py` | Assign roles to created users | 🟠 High |
| `firebase_auth.py` | Assign roles to created users | 🟠 High |

### Configuration Changes

Add to `.env`:
```
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_token
WHATSAPP_APP_SECRET=your_secret
```

---

## Validation Checklist

### After Deployment

- [ ] Student cannot create invoices
- [ ] Teacher cannot access finance data
- [ ] Parent can see only their children's data
- [ ] Admin can see all data
- [ ] WhatsApp webhook only accepts signed requests
- [ ] Token role cannot be modified
- [ ] All users have correct roles in database
- [ ] No 403 errors in legitimate flows
- [ ] Audit logs show proper access

---

## Support & Questions

If you encounter issues:

1. **Check logs:** `docker-compose logs -f web`
2. **Verify configuration:** Check .env and settings.py
3. **Test endpoints:** Use provided test cases
4. **Review changes:** Compare with FIXES_*.py files
5. **Rollback if needed:** Follow rollback plan

---

## Timeline

- **Day 1:** Implement JWT & is_staff fixes
- **Day 2:** Secure webhooks & add finance checks
- **Day 3:** Testing & validation
- **Week 2:** Additional hardening
- **Week 3:** Audit & compliance

---

## Success Criteria

- ✅ Students cannot access finance data
- ✅ Teachers cannot create invoices
- ✅ Parents can only see their children
- ✅ Webhooks verify signatures
- ✅ All endpoints enforce roles
- ✅ No security warnings in audit

---

**Generated:** June 1, 2026  
**Next Review:** June 15, 2026
