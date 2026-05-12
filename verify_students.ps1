Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "📋 STUDENT MODULE VERIFICATION REPORT" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host "`n🔍 BACKEND VERIFICATION" -ForegroundColor Yellow
Write-Host "-" * 50

# Check student data in backend
cd backend
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
import django
django.setup()
from django.apps import apps

Student = apps.get_model('education_students', 'Student')
total_students = Student.objects.count()
active_students = Student.objects.filter(is_active=True).count()
inactive_students = Student.objects.filter(is_active=False).count()

print(f'✅ Total Students: {total_students}')
print(f'✅ Active Students: {active_students}')
print(f'✅ Inactive Students: {inactive_students}')

# Get first 5 students for testing
print(f'\n📋 Sample Students (first 5):')
for s in Student.objects.all()[:5]:
    print(f'   • {s.full_name} (ID: {s.student_id}) - Class: {s.current_class.name if s.current_class else "N/A"} - Active: {s.is_active}')
"

Write-Host "`n🔍 API ENDPOINTS VERIFICATION" -ForegroundColor Yellow
Write-Host "-" * 50

# Test login
$body = @{email="admin@code.com"; password="admin123"} | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login/" -Method POST -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue
$token = $login.access
$headers = @{ "Authorization" = "Bearer $token" }

# Test student list API
Write-Host "`n📌 Testing /api/auth/students/ ..." -ForegroundColor Gray
try {
    $students = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/students/" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "   ✅ Student list API works - Returns $($students.Count) students" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Student list API failed: $_" -ForegroundColor Red
}

# Test single student API
Write-Host "`n📌 Testing /api/auth/students/<id>/ ..." -ForegroundColor Gray
try {
    $firstStudent = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/students/?limit=1" -Method GET -Headers $headers
    if ($firstStudent -and $firstStudent.Count -gt 0) {
        $studentId = $firstStudent[0].id
        $singleStudent = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/students/$studentId/" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "   ✅ Single student API works - Student: $($singleStudent.full_name)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Single student API failed: $_" -ForegroundColor Red
}

Write-Host "`n🔍 FRONTEND FILES VERIFICATION" -ForegroundColor Yellow
Write-Host "-" * 50

cd ../frontend

# Check if files exist
$files = @(
    "src/pages/education/StudentsListPage.tsx",
    "src/pages/education/students/StudentProfilePage.tsx",
    "src/pages/education/students/EditStudentPage.tsx",
    "src/pages/education/students/AddStudentPage.tsx",
    "src/services/student.service.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file MISSING" -ForegroundColor Red
    }
}

Write-Host "`n🔍 STUDENT SERVICE VERIFICATION" -ForegroundColor Yellow
Write-Host "-" * 50

# Check student service methods
Get-Content "src/services/student.service.ts" | Select-String "export default|getAll|getById|create|update|delete" | ForEach-Object {
    Write-Host "   📌 $_" -ForegroundColor Gray
}

Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
Write-Host "✅ VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
