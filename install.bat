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

:: Detect Machine ID from Windows hardware
if not exist ".machine-id" (
    for /f "skip=2 tokens=2*" %%a in ('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography" /v MachineGuid 2^>nul') do set RAW_ID=%%b
    if not defined RAW_ID (
        for /f %%i in ('powershell -Command "[System.Environment]::MachineName + '-' + (Get-WmiObject Win32_BaseBoard).SerialNumber"') do set RAW_ID=%%i
    )
    powershell -Command "$id = '$RAW_ID'; $bytes = [System.Text.Encoding]::UTF8.GetBytes($id); $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes); [System.BitConverter]::ToString($hash).Replace('-','').ToLower() | Out-File -FilePath '.machine-id' -Encoding ascii -NoNewline"
    echo  [OK] Machine ID generated
)
set /p MACHINE_ID=<.machine-id
set MACHINE_ID=%MACHINE_ID%

:: Create empty license file if not exists
if not exist "license.key" echo.>license.key

:: ── LAN Mode Setup ────────────────────────────────────────
echo.
echo [LAN] Do you want other devices on the network to access this app?
echo   (Y) YES - Access from phones, tablets, other PCs on the same WiFi/LAN
echo   (N) NO  - This PC only (localhost)
echo.
set /p LAN_CHOICE="   Your choice [Y/N]: "

if /i "%LAN_CHOICE%"=="Y" (
    for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R "IPv4.*192\." 2^>nul') do (
        set LAN_IP=%%i
        goto :GOT_IP
    )
    for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R "IPv4.*10\." 2^>nul') do (
        set LAN_IP=%%i
        goto :GOT_IP
    )
    for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R "IPv4.*172\." 2^>nul') do (
        set LAN_IP=%%i
        goto :GOT_IP
    )
    :GOT_IP
    set LAN_IP=%LAN_IP: =%
    set APP_URL=http://%LAN_IP%:3000
    echo.
    echo  [LAN] App will be accessible at: %APP_URL%
    echo  [LAN] Share this URL with other devices on the same network!
) else (
    set APP_URL=http://localhost:3000
    echo.
    echo  [LOCAL] App will only be accessible on this PC.
)


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
