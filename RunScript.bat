@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\ops\restart-dashboard.ps1"
pause
