import os
import re
from pathlib import Path
from collections import defaultdict

print("=" * 80)
print("RBAC PERMISSION AUDIT - Finding Missing Role Restrictions")
print("=" * 80)

ROOT = Path(".")

# Files to check
backend_views = list((ROOT / "backend").rglob("views.py"))
backend_urls = list((ROOT / "backend").rglob("urls.py"))
frontend_pages = list((ROOT / "frontend/src/pages").rglob("*.tsx"))
frontend_components = list((ROOT / "frontend/src/components").rglob("*.tsx"))

print(f"\n📁 Files Analyzed:")
print(f"  Backend Views: {len(backend_views)}")
print(f"  Backend URLs: {len(backend_urls)}")
print(f"  Frontend Pages: {len(frontend_pages)}")
print(f"  Frontend Components: {len(frontend_components)}")

# ============================================================
# 1. CHECK BACKEND PERMISSION CLASSES
# ============================================================
print("\n" + "=" * 80)
print("1. BACKEND PERMISSION CLASSES")
print("=" * 80)

missing_permissions = []
has_permissions = []
custom_permissions = []

for view_file in backend_views:
    try:
        content = view_file.read_text(encoding="utf-8")
        
        # Find all @api_view decorators
        api_views = re.findall(r'@api_view\([^)]+\)\s+def\s+(\w+)', content)
        
        for view_name in api_views:
            # Get the function content
            func_start = content.find(f'def {view_name}')
            func_end = content.find('def ', func_start + 1) if content.find('def ', func_start + 1) != -1 else len(content)
            func_content = content[func_start:func_end]
            
            # Check if permission_classes is set
            if 'permission_classes' not in func_content:
                missing_permissions.append({
                    'file': view_file.name,
                    'view': view_name
                })
            elif 'IsAuthenticated' in func_content:
                has_permissions.append({
                    'file': view_file.name,
                    'view': view_name
                })
            
            # Check for role-based permissions
            if any(role in func_content for role in ['IsAdmin', 'IsTeacher', 'IsStudent', 'IsParent']):
                custom_permissions.append({
                    'file': view_file.name,
                    'view': view_name
                })
                
    except Exception as e:
        pass

print(f"\n✅ Views WITH Authentication: {len(has_permissions)}")
print(f"⚠️  Views WITHOUT Permission Classes: {len(missing_permissions)}")
print(f"🔐 Views with Role-Based Permissions: {len(custom_permissions)}")

if missing_permissions:
    print("\n⚠️  Views MISSING permission_classes:")
    for item in missing_permissions[:10]:
        print(f"   - {item['view']} in {item['file']}")

# ============================================================
# 2. CHECK FRONTEND ROLE PROTECTION
# ============================================================
print("\n" + "=" * 80)
print("2. FRONTEND ROLE PROTECTION")
print("=" * 80)

role_checks = []
no_role_checks = []

for page in frontend_pages:
    try:
        content = page.read_text(encoding="utf-8")
        
        # Check for role-based rendering
        has_role_check = any([
            'user?.role' in content,
            'user.role' in content,
            'role ===' in content,
            'isAdmin' in content,
            'isTeacher' in content,
            'isStudent' in content,
            'isParent' in content,
            'ProtectedRoute' in content,
            'useAuth' in content,
            'allowedRoles' in content,
            'RoleBasedRoute' in content
        ])
        
        if has_role_check:
            role_checks.append(page.stem)
        else:
            no_role_checks.append(page.stem)
            
    except Exception as e:
        pass

print(f"\n✅ Pages WITH Role Checks: {len(role_checks)}")
print(f"⚠️  Pages WITHOUT Role Checks: {len(no_role_checks)}")

if no_role_checks:
    print("\n⚠️  Pages that may be accessible to ALL roles:")
    for page in no_role_checks[:15]:
        print(f"   - {page}")

# ============================================================
# 3. CHECK USER MODEL FOR ROLE FIELD
# ============================================================
print("\n" + "=" * 80)
print("3. USER MODEL ROLE FIELD")
print("=" * 80)

has_role_field = False
role_choices = []

for model_file in (ROOT / "backend").rglob("models.py"):
    try:
        content = model_file.read_text(encoding="utf-8")
        if 'class User' in content or 'class CustomUser' in content:
            if 'role' in content.lower():
                has_role_field = True
                # Extract role choices
                role_match = re.search(r'role.*?choices.*?=\s*\[(.*?)\]', content, re.DOTALL)
                if role_match:
                    role_choices = role_match.group(1)
                print(f"✅ Role field found in {model_file.name}")
                if role_choices:
                    print(f"   Role choices: {role_choices[:100]}")
            else:
                print(f"❌ NO role field found in {model_file.name}")
    except:
        pass

if not has_role_field:
    print("❌ CRITICAL: No role field found in User model!")

# ============================================================
# 4. SCORE CALCULATION
# ============================================================
print("\n" + "=" * 80)
print("RBAC IMPLEMENTATION SCORE")
print("=" * 80)

total_views = len(has_permissions) + len(missing_permissions)
auth_percentage = (len(has_permissions) / total_views * 100) if total_views > 0 else 0

total_pages = len(role_checks) + len(no_role_checks)
role_percentage = (len(role_checks) / total_pages * 100) if total_pages > 0 else 0

rbac_score = (auth_percentage + role_percentage) / 2

print(f"🔐 API Authentication Coverage: {auth_percentage:.1f}%")
print(f"🛡️  Frontend Role Check Coverage: {role_percentage:.1f}%")
print(f"📊 Overall RBAC Score: {rbac_score:.1f}%")

print("\n" + "=" * 80)
if rbac_score >= 90:
    print("✅ EXCELLENT! RBAC is well implemented!")
elif rbac_score >= 70:
    print("⚠️ GOOD but needs improvements in some areas")
elif rbac_score >= 50:
    print("🔴 NEEDS WORK - Add permission classes to API views")
else:
    print("🔴 CRITICAL - RBAC is missing or incomplete!")

print("\n📋 RECOMMENDATIONS:")
print("-" * 40)

if auth_percentage < 90:
    print("1. Add @permission_classes([IsAuthenticated]) to all API views")
if role_percentage < 90:
    print("2. Add role-based checks in frontend pages")
if not has_role_field:
    print("3. Add 'role' field to User model")
if len(custom_permissions) == 0:
    print("4. Create custom permission classes for Teacher/Student/Parent roles")
    
print("=" * 80)
