from pathlib import Path
import re
from datetime import datetime

ROOT = Path(".")

print("=" * 100)
print("SCHOOL ERP - FINAL AUDIT V2")
print("=" * 100)
print("Audit Time:", datetime.now())
print("=" * 100)

# ==========================================================
# FILE DISCOVERY
# ==========================================================

frontend_pages = list((ROOT / "frontend/src/pages").rglob("*.tsx")) if (ROOT / "frontend/src/pages").exists() else []
frontend_components = list((ROOT / "frontend/src/components").rglob("*.tsx")) if (ROOT / "frontend/src/components").exists() else []
frontend_services = list((ROOT / "frontend/src/services").rglob("*.ts")) if (ROOT / "frontend/src/services").exists() else []
frontend_hooks = list((ROOT / "frontend/src/hooks").rglob("*.ts")) if (ROOT / "frontend/src/hooks").exists() else []

backend_urls = list((ROOT / "backend").rglob("urls.py"))
backend_views = list((ROOT / "backend").rglob("views.py"))
backend_models = list((ROOT / "backend").rglob("models.py"))
backend_serializers = list((ROOT / "backend").rglob("serializers.py"))
backend_migrations = list((ROOT / "backend").rglob("*.py"))

print("\nFILE COUNTS")
print("-" * 60)
print(f"Frontend Pages      : {len(frontend_pages)}")
print(f"Frontend Components : {len(frontend_components)}")
print(f"Frontend Services   : {len(frontend_services)}")
print(f"Frontend Hooks      : {len(frontend_hooks)}")
print(f"Backend URLs        : {len(backend_urls)}")
print(f"Backend Views       : {len(backend_views)}")
print(f"Backend Models      : {len(backend_models)}")
print(f"Backend Serializers : {len(backend_serializers)}")
print(f"Backend Python Files: {len(backend_migrations)}")

# ==========================================================
# ROUTE AUDIT
# ==========================================================

print("\nROUTE AUDIT")
print("-" * 60)

route_files = []
route_files.extend(list((ROOT / "frontend/src").rglob("App.tsx")))
route_files.extend(list((ROOT / "frontend/src").rglob("*Router*.tsx")))
route_files.extend(list((ROOT / "frontend/src").rglob("*Routes*.tsx")))
route_files.extend(list((ROOT / "frontend/src").rglob("*routes*.tsx")))

route_text = ""

for file in route_files:
    try:
        route_text += file.read_text(encoding="utf-8")
    except:
        pass

registered_pages = 0
unregistered_pages = []

for page in frontend_pages:
    page_name = page.stem
    if page_name in route_text:
        registered_pages += 1
    else:
        unregistered_pages.append(page_name)

route_percent = round((registered_pages / max(len(frontend_pages), 1)) * 100, 1)

print("Pages Registered :", registered_pages)
print("Pages Missing    :", len(unregistered_pages))
print("Route Coverage   :", route_percent, "%")

# ==========================================================
# FRONTEND API AUDIT
# ==========================================================

print("\nFRONTEND API AUDIT")
print("-" * 60)

frontend_api_calls = []

for service in frontend_services:
    try:
        txt = service.read_text(encoding="utf-8")
        matches = re.findall(r"api\.(?:get|post|put|patch|delete)\(['\"]([^'\"]+)['\"]", txt)
        frontend_api_calls.extend(matches)
    except:
        pass

frontend_api_calls = sorted(set(frontend_api_calls))

print("API Calls Found :", len(frontend_api_calls))

# ==========================================================
# BACKEND URL AUDIT
# ==========================================================

print("\nBACKEND URL AUDIT")
print("-" * 60)

backend_endpoints = []

for url_file in backend_urls:
    try:
        txt = url_file.read_text(encoding="utf-8")
        matches = re.findall(r"path\(['\"]([^'\"]+)['\"]", txt)
        backend_endpoints.extend(matches)
    except:
        pass

backend_endpoints = sorted(set(backend_endpoints))

print("Backend Endpoints :", len(backend_endpoints))

# ==========================================================
# SERVICE USAGE AUDIT
# ==========================================================

print("\nSERVICE USAGE AUDIT")
print("-" * 60)

all_page_text = ""

for page in frontend_pages:
    try:
        all_page_text += page.read_text(encoding="utf-8")
    except:
        pass

unused_services = []

for service in frontend_services:
    service_name = service.stem
    if service_name not in all_page_text:
        unused_services.append(service_name)

print("Unused Services :", len(unused_services))

# ==========================================================
# AUTH AUDIT
# ==========================================================

print("\nAUTHENTICATION AUDIT")
print("-" * 60)

auth_count = 0

for view in backend_views:
    try:
        txt = view.read_text(encoding="utf-8")
        if "IsAuthenticated" in txt or "permission_classes" in txt or "JWTAuthentication" in txt:
            auth_count += 1
    except:
        pass

print("Protected View Files :", auth_count)

# ==========================================================
# FEATURE FLAG AUDIT
# ==========================================================

print("\nFEATURE FLAG AUDIT")
print("-" * 60)

feature_files = [x for x in (ROOT / "backend").rglob("*.py") if "feature" in str(x).lower()]

print("Feature Files :", len(feature_files))

# ==========================================================
# TENANT AUDIT
# ==========================================================

print("\nTENANT AUDIT")
print("-" * 60)

tenant_files = [x for x in (ROOT / "backend").rglob("*.py") if "tenant" in str(x).lower()]

print("Tenant Files :", len(tenant_files))

# ==========================================================
# MODULE AUDIT
# ==========================================================

print("\nMODULE AUDIT")
print("-" * 60)

modules = [
    "students",
    "attendance",
    "exams",
    "finance",
    "admissions",
    "analytics",
    "communication",
    "academics"
]

module_score = 0

for module in modules:
    frontend_ok = any(module in str(x).lower() for x in frontend_pages)
    backend_ok = any(module in str(x).lower() for x in backend_urls)
    model_ok = any(module in str(x).lower() for x in backend_models)
    
    if frontend_ok and backend_ok and model_ok:
        status = "PASS"
        module_score += 1
    else:
        status = "FAIL"
    
    print(f"{module.upper():15} Frontend={frontend_ok} Backend={backend_ok} Models={model_ok} ==> {status}")

# ==========================================================
# INTEGRATION AUDIT
# ==========================================================

print("\nINTEGRATION AUDIT")
print("-" * 60)

matched = 0

for api in frontend_api_calls:
    clean_api = api.strip("/").split("/")[-1]
    for endpoint in backend_endpoints:
        if clean_api and clean_api in endpoint:
            matched += 1
            break

integration_score = round((matched / max(len(frontend_api_calls), 1)) * 100, 1)

print("Matched APIs     :", matched)
print("Integration Rate :", integration_score, "%")

# ==========================================================
# FINAL SCORE
# ==========================================================

score = 0
score += route_percent * 0.25
score += integration_score * 0.25

if auth_count > 0:
    score += 15

if len(feature_files) > 0:
    score += 10

if len(tenant_files) > 0:
    score += 10

score += (module_score / max(len(modules), 1)) * 40
score = round(min(score, 100), 1)

print("\n" + "=" * 100)
print("FINAL ERP READINESS SCORE :", score, "%")
print("=" * 100)

if score >= 90:
    print("STATUS : PRODUCTION READY")
elif score >= 75:
    print("STATUS : QA REVIEW REQUIRED")
elif score >= 50:
    print("STATUS : INTEGRATION WORK REMAINING")
else:
    print("STATUS : NOT READY")

print("=" * 100)

if unregistered_pages:
    print("\n⚠️ UNREGISTERED PAGES (Need route configuration):")
    print("-" * 60)
    for page in sorted(unregistered_pages)[:10]:
        print(" -", page)

if unused_services:
    print("\n⚠️ UNUSED SERVICES (Not imported anywhere):")
    print("-" * 60)
    for service in sorted(unused_services)[:10]:
        print(" -", service)

print("\n" + "=" * 100)
print("AUDIT COMPLETE")
print("=" * 100)