@echo off
REM ==========================================================================
REM  ERP-V2 local demo: installs (first run), seeds a demo school, starts the
REM  backend on http://localhost:8001 and the frontend on http://localhost:5179
REM  No API keys needed. See README "Run the demo locally".
REM ==========================================================================
setlocal
set DEBUG=1
set USE_SQLITE=1

cd /d "%~dp0backend"
if not exist .venv\Scripts\python.exe (
  echo [1/4] Creating Python environment and installing packages...
  python -m venv .venv || goto :fail
  .venv\Scripts\python -m pip install --upgrade pip
  .venv\Scripts\python -m pip install -r requirements.txt scikit-learn pandas xgboost || goto :fail
)

set FIRST_RUN=
if not exist db.sqlite3 set FIRST_RUN=1
if exist db.sqlite3 for %%A in (db.sqlite3) do if %%~zA==0 set FIRST_RUN=1

echo [2/4] Preparing database...
.venv\Scripts\python manage.py migrate --noinput || goto :fail
if defined FIRST_RUN (
  echo [3/4] Creating demo school data - takes about 2 minutes...
  .venv\Scripts\python manage.py seed_sample_users --force || goto :fail
  .venv\Scripts\python manage.py seed_demo || goto :fail
) else (
  echo [3/4] Demo data already present - to rebuild: .venv\Scripts\python manage.py seed_demo --reset
)

echo [4/4] Starting servers...
start "ERP backend (port 8001)" cmd /k ".venv\Scripts\python manage.py runserver 0.0.0.0:8001"

cd /d "%~dp0frontend"
if not exist node_modules call npm install
set VITE_API_URL=http://localhost:8001/api/v1/
set VITE_WS_NOTIFICATIONS_URL=ws://localhost:8001/ws/notifications/
set VITE_WS_DASHBOARD_URL=ws://localhost:8001/ws/dashboard/
set VITE_WS_URL=ws://localhost:8001/ws/notifications/
set VITE_PROXY_TARGET=http://localhost:8001
start "ERP frontend (port 5179)" cmd /k "npx vite --port 5179 --strictPort"

timeout /t 10 /nobreak >nul
start "" http://localhost:5179/login
echo.
echo Demo running. Log in as admin@code.com / Admin@123
echo Close the two server windows to stop.
exit /b 0

:fail
echo.
echo Setup failed - see the messages above.
exit /b 1
