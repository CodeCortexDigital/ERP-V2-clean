# db_health_check.ps1
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$result = & "$pgBin\pg_isready.exe" -U postgres

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL is healthy" -ForegroundColor Green
    
    # Create backup with timestamp
    $backupFile = "D:\erp_v2_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    & "$pgBin\pg_dump.exe" -U postgres -d erp_v2 -f $backupFile
    Write-Host "✅ Backup created: $backupFile" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL is not healthy!" -ForegroundColor Red
    Write-Host "Run: cd 'C:\Program Files\PostgreSQL\18\bin'; .\pg_ctl.exe start -D 'C:\Program Files\PostgreSQL\18\data'" -ForegroundColor Yellow
}
