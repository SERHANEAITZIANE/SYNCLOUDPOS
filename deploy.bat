@echo off
echo.
echo ===================================================
echo     SYNCLOUDPOS - Deploiement Rapide vers le VPS
echo ===================================================
echo.

echo [1/3] Verification des changements...
git add .

echo [2/3] Creation d'une sauvegarde de l'etat actuel...
git commit -m "Deploiement automatique: %date% %time%"

echo.
echo [2.4/3] Verification des types (tsc)...
REM next.config.ts active ignoreBuildErrors, donc "npm run build" laisse passer
REM les erreurs de type. tsc est la seule barriere reelle.
call npm run typecheck
if errorlevel 1 (
    echo =============================================
    echo   DEPLOIEMENT ANNULE : ERREURS DE TYPE !
    echo =============================================
    pause
    exit /b 1
)

echo.
echo [2.5/3] Execution des tests...
call npx vitest run
if errorlevel 1 (
    echo =============================================
    echo   DEPLOIEMENT ANNULE : TESTS EN ECHEC !
    echo =============================================
    pause
    exit /b 1
)

echo.
echo [2.6/3] Verification du lint (0 erreur requise)...
call npm run lint
if errorlevel 1 (
    echo =============================================
    echo   DEPLOIEMENT ANNULE : ERREURS DE LINT !
    echo =============================================
    pause
    exit /b 1
)

echo.
echo [3/3] Envoi des donnees et compilation sur le serveur VPS...
echo (Veuillez patienter pendant la compilation sur le serveur...)
echo.
git push vps master

echo.
echo ===================================================
echo       DEPLOIEMENT TERMINE AVEC SUCCES !
echo ===================================================
echo.
pause
