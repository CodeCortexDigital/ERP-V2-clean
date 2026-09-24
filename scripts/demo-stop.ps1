# Stops the local demo started by demo.bat: backend on 8001, frontend on 5179.
# Other dev servers (e.g. on 8000 / 5173) are left alone.
$ErrorActionPreference = 'SilentlyContinue'
$stopped = 0

# 1. Whatever is listening on the demo ports.
foreach ($port in 8001, 5179) {
    foreach ($conn in Get-NetTCPConnection -LocalPort $port -State Listen) {
        Stop-Process -Id $conn.OwningProcess -Force
        $stopped++
    }
}

# 2. The demo's server windows and helper processes (Django autoreloader, npx/vite).
Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -match 'runserver 0\.0\.0\.0:8001|vite(\.js"?)? --port 5179|ERP (backend|frontend) \(port' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force; $stopped++ }

if ($stopped -gt 0) { Write-Host "ERP demo stopped." } else { Write-Host "ERP demo was not running." }
