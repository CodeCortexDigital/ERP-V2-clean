# RBAC Fixes - Quick Reference Card

Print this and keep at your desk while implementing fixes!

---

## 🔴 CRITICAL FIX #1: JWT Role Injection

**Files:** 
- `backend/services/education/students/authentication.py`
- `backend/services/education/academics/authentication.py`

**Find & Delete:**
```python
user_role = payload.get('role', 'user')
# AND
user.role = user_role
```

**Time:** 2 minutes  
**Impact:** Prevents JWT tampering  

---

## 🔴 CRITICAL FIX #2: is_staff Flag

**File:** `backend/services/core/accounts/decorators.py`

**Change THIS:**
```python
if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
    return 'admin'
```

**To THIS:**
```python
if getattr(user, 'is_superuser', False):
    return 'admin'
```

**Time:** 1 minute  
**Impact:** Prevents staff users from being admin  

---

## 🔴 CRITICAL FIX #3: WhatsApp Webhook

**File:** `backend/services/communication/whatsapp/views.py`

**Add this method:**
```python
def _verify_webhook_signature(self, request):
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

**Call in post():**
```python
if not self._verify_webhook_signature(request):
    return Response({'detail': 'Invalid signature'}, status=403)
```

**Add to settings:**
```python
WHATSAPP_APP_SECRET = os.environ.get('WHATSAPP_APP_SECRET', '')
```

**Time:** 15 minutes  
**Impact:** Prevents webhook spoofing  

---

## 🔴 CRITICAL FIX #4: Finance Role Checks

**File:** `backend/services/education/finance/views.py`

**Add class:**
```python
from rest_framework.permissions import BasePermission
from services.core.accounts.decorators import get_user_role

class IsFinanceStaffOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user_role = get_user_role(request.user)
        return user_role in ['admin', 'accountant']
```

**Update views:**
```python
# CHANGE THIS:
class InvoiceListCreateView(...):
    permission_classes = [IsAuthenticated]

# TO THIS:
class InvoiceListCreateView(...):
    permission_classes = [IsFinanceStaffOrAdmin]
```

**Apply to:** All finance views (Fee, Invoice, Payment, etc.)

**Time:** 30 minutes  
**Impact:** Prevents unauthorized financial access  

---

## 🧪 Quick Tests

### Test 1: JWT (Student cannot create invoice)
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/token/ \
  -d '{"email":"student@test.com","password":"pass"}' | jq -r '.access')

curl -X POST http://localhost:8000/api/finance/invoices/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":5000}'

# BEFORE: 201 ❌  |  AFTER: 403 ✅
```

### Test 2: is_staff (Staff is not admin)
```python
python manage.py shell

>>> from services.core.accounts.decorators import get_user_role
>>> from services.core.accounts.models import User
>>> staff = User.objects.create_user('staff@test.com', 'pass', is_staff=True)
>>> print(get_user_role(staff))

# BEFORE: admin ❌  |  AFTER: None ✅
```

### Test 3: Webhook (No signature = rejected)
```bash
curl -X POST http://localhost:8000/api/whatsapp/webhook/ \
  -d '{"entry":[]}'

# BEFORE: 200 ❌  |  AFTER: 403 ✅
```

---

## 📋 Implementation Checklist

**Day 1:**
- [ ] Fix JWT role injection (5 min)
- [ ] Fix is_staff vulnerability (1 min)
- [ ] Test basic auth (5 min)
- [ ] Verify no breakage (10 min)

**Day 2:**
- [ ] Add webhook signature verification (15 min)
- [ ] Add finance permission class (15 min)
- [ ] Update all finance views (15 min)
- [ ] Test finance endpoints (10 min)

**Day 3:**
- [ ] Run full test suite (30 min)
- [ ] Deploy to production (20 min)
- [ ] Monitor logs (30 min)
- [ ] Verify access controls (30 min)

---

## 🚀 Deploy Command

```bash
# 1. Backup
docker-compose exec db pg_dump -U postgres postgres > backup.sql

# 2. Deploy
git pull
docker-compose restart web

# 3. Test
python manage.py test tests.test_rbac_fixes

# 4. Verify
curl http://localhost:8000/api/students/ -H "Auth: Bearer $(token)"
```

---

## 🔍 Verify Fixes

### Check 1: Is JWT role removed?
```bash
grep -n "payload.get('role'" backend/services/education/*/authentication.py
# Should return: NO MATCHES
```

### Check 2: Is is_staff removed?
```bash
grep -n "is_staff" backend/services/core/accounts/decorators.py | grep -v "is_superuser"
# Should return: NO MATCHES (only is_superuser)
```

### Check 3: Is webhook verified?
```bash
grep -n "_verify_webhook_signature" backend/services/communication/whatsapp/views.py
# Should return: Method definition + call in post()
```

### Check 4: Is finance checked?
```bash
grep -n "IsFinanceStaffOrAdmin" backend/services/education/finance/views.py
# Should return: 1+ matches
```

---

## 💾 Configuration

Add to `.env`:
```
WHATSAPP_APP_SECRET=your_secret_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_token_here
```

---

## 📞 Emergency Contacts

- **JWT Issue:** See `FIXES_JWT_ROLE_INJECTION.py`
- **is_staff Issue:** See `FIXES_IS_STAFF_VULNERABILITY.py`
- **Webhook Issue:** See `FIXES_WEBHOOK_AND_FINANCE.py`
- **Finance Issue:** See `FIXES_WEBHOOK_AND_FINANCE.py`

---

## ⏱️ Time Budget

| Task | Time | Priority |
|------|------|----------|
| JWT fix | 5 min | 🔴 CRITICAL |
| is_staff fix | 1 min | 🔴 CRITICAL |
| Webhook fix | 15 min | 🔴 CRITICAL |
| Finance fix | 30 min | 🔴 CRITICAL |
| Testing | 1 hour | 🔴 CRITICAL |
| Deployment | 1 hour | 🔴 CRITICAL |
| **TOTAL** | **~3 hours active** | |

---

**Created:** June 1, 2026  
**Status:** Ready to implement  
**Complexity:** LOW (mostly copy-paste)  
**Risk:** CRITICAL (must deploy)
