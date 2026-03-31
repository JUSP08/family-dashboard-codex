$ErrorActionPreference = "Stop"

$StopScript = Join-Path $PSScriptRoot "stop-dashboard.ps1"
$StartScript = Join-Path $PSScriptRoot "start-dashboard.ps1"

Write-Host "== Family Dashboard Windows: RESTART ==" -ForegroundColor Cyan

& $StopScript
Start-Sleep -Seconds 2
& $StartScript