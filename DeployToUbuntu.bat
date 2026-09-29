@echo off
setlocal
cd /d "%~dp0"

echo Family Dashboard - Ubuntu Deployment
echo ====================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\ops\deploy-dashboard-ssh.ps1"
set "DEPLOY_EXIT=%ERRORLEVEL%"

echo.
if not "%DEPLOY_EXIT%"=="0" (
  echo Deployment failed. Review the message above before trying again.
) else (
  echo Deployment completed successfully.
)

pause
exit /b %DEPLOY_EXIT%
