$ErrorActionPreference = "Stop"

Write-Host "== Family Dashboard Windows: STOP ==" -ForegroundColor Cyan

$RepoRoot = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $RepoRoot "backend\data\dashboard.pid"

if (-not (Test-Path -LiteralPath $PidFile)) {
    Write-Host "No dashboard PID file was found. Nothing was stopped." -ForegroundColor Yellow
    return
}

$DashboardPid = [int](Get-Content -LiteralPath $PidFile -Raw)
$ProcessInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $DashboardPid" -ErrorAction SilentlyContinue

if (-not $ProcessInfo) {
    Remove-Item -LiteralPath $PidFile -Force
    Write-Host "The saved dashboard process is no longer running." -ForegroundColor Yellow
    return
}

$PortOwner = Get-NetTCPConnection -LocalPort 8099 -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.OwningProcess -eq $DashboardPid }
if (-not $PortOwner) {
    throw "PID $DashboardPid does not own dashboard port 8099. Refusing to stop it."
}

Stop-Process -Id $DashboardPid -Force
Remove-Item -LiteralPath $PidFile -Force
Write-Host "Stopped dashboard PID: $DashboardPid" -ForegroundColor Green
