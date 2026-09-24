@echo off
REM Stops the local demo (backend :8001, frontend :5179).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\demo-stop.ps1"
timeout /t 3 /nobreak >nul
