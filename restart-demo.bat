@echo off
REM Restarts the local demo (backend :8009, frontend :5179).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\demo-stop.ps1"
timeout /t 2 /nobreak >nul
call "%~dp0demo.bat"
