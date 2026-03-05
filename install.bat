@echo off
title SYNCLOUDPOS - Installation
color 0A

echo.
echo  ███████╗██╗   ██╗███╗   ██╗ ██████╗██╗      ██████╗ ██╗   ██╗██████╗  ██████╗ ███████╗
echo  ██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝██║     ██╔═══██╗██║   ██║██╔══██╗██╔═══██╗██╔════╝
echo  ███████╗ ╚████╔╝ ██╔██╗ ██║██║     ██║     ██║   ██║██║   ██║██║  ██║██║   ██║███████╗
echo  ╚════██║  ╚██╔╝  ██║╚██╗██║██║     ██║     ██║   ██║██║   ██║██║  ██║██║   ██║╚════██║
echo  ███████║   ██║   ██║ ╚████║╚██████╗███████╗╚██████╔╝╚██████╔╝██████╔╝╚██████╔╝███████║
echo  ╚══════╝   ╚═╝   ╚═╝  ╚═══╝ ╚═════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝  ╚═════╝╚══════╝
echo.
echo  Point of Sale System - Local Installer
echo  =========================================
echo.

:: ── Check Docker ──────────────────────────────────────────
echo [1/5] Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Docker is not installed!
    echo  Please install Docker Desktop from:
    echo  https://www.docker.com/products/docker-desktop/
    echo.
    echo  After installing, restart this script.
    pause
    exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Docker Desktop is not running!
    echo  Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo  [OK] Docker is ready

:: ── Setup .env.local ──────────────────────────────────────
echo.
echo [2/5] Setting up configuration...

if not exist ".env.local" (
    copy ".env.example" ".env.local" >nul

    :: Generate a random secret automatically
    for /f "tokens=*" %%i in ('powershell -Command "[System.Guid]::NewGuid().ToString('N') + [System.Guid]::NewGuid().ToString('N')"') do set RANDOM_SECRET=%%i
    powershell -Command "(Get-Content .env.local) -replace 'change_this_to_a_random_32_char_secret', '%RANDOM_SECRET%' | Set-Content .env.local"

    echo  [OK] Configuration file created (.env.local)
    echo.
    echo  NOTE: Optional features (Google Login, WhatsApp OTP, AI assistant)
    echo  require API keys. Edit .env.local to configure them.
    echo.
) else (
    echo  [OK] Using existing .env.local
)

:: ── Pull and Build ─────────────────────────────────────────
echo.
echo [3/5] Building application (this takes 3-5 minutes on first run)...
docker compose build --no-cache
if %errorlevel% neq 0 (
    echo  ERROR: Build failed. Check the error messages above.
    pause
    exit /b 1
)
echo  [OK] Build complete

:: ── Start services ─────────────────────────────────────────
echo.
echo [4/5] Starting all services (PostgreSQL + Redis + App)...
docker compose up -d
if %errorlevel% neq 0 (
    echo  ERROR: Failed to start services.
    pause
    exit /b 1
)
echo  [OK] Services starting...

:: ── Wait for healthy ───────────────────────────────────────
echo.
echo [5/5] Waiting for the app to be ready...
set /a ATTEMPTS=0
:WAIT_LOOP
set /a ATTEMPTS+=1
if %ATTEMPTS% gtr 40 (
    echo.
    echo  Timeout waiting for app. Check logs with:
    echo    docker compose logs app
    pause
    exit /b 1
)
timeout /t 3 /nobreak >nul
powershell -Command "try { $r = Invoke-WebRequest http://localhost:3000/api/health -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch { exit 1 }"
if %errorlevel% neq 0 goto WAIT_LOOP

:: ── Done! ──────────────────────────────────────────────────
echo.
echo  ============================================
echo   SYNCLOUDPOS is ready!
echo  ============================================
echo.
echo   Open your browser and go to:
echo.
echo     http://localhost:3000
echo.
echo   First time? Click "Register" to create
echo   your store and superadmin account.
echo.
echo   To stop the app:   docker compose down
echo   To start again:    docker compose up -d
echo   To view logs:      docker compose logs -f
echo  ============================================
echo.
start "" "http://localhost:3000"
pause
