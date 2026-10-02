@echo off
setlocal
set "DEPLOY_SCRIPT=%~dp0ops\deploy-dashboard-ssh.ps1"

echo Family Dashboard - Ubuntu Deployment
echo ====================================
echo.

if not exist "%DEPLOY_SCRIPT%" (
  echo Deployment script is missing:
  echo "%DEPLOY_SCRIPT%"
  echo.
  echo Run DeployToUbuntu.bat from the complete family-dashboard-codex folder.
  echo For a Desktop button, create a shortcut to the original .bat file.
  echo Do not copy the .bat file by itself.
  pause
  exit /b 1
)

pushd "%~dp0"
if errorlevel 1 (
  echo Cannot open the dashboard project folder: "%~dp0"
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%DEPLOY_SCRIPT%"
set "DEPLOY_EXIT=%ERRORLEVEL%"
popd

echo.
if not "%DEPLOY_EXIT%"=="0" (
  echo Deployment failed. Review the message above before trying again.
) else (
  echo Deployment completed successfully.
)

pause
exit /b %DEPLOY_EXIT%
