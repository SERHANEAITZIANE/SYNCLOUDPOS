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
