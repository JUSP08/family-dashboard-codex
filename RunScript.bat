@echo off
cd /d "C:\family-dashboard-windows"
powershell -ExecutionPolicy Bypass -File ".\ops\restart-dashboard.ps1"
pause