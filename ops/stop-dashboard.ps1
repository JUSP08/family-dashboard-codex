$ErrorActionPreference = "SilentlyContinue"

Write-Host "== Family Dashboard Windows: STOP ==" -ForegroundColor Cyan

$Connections = Get-NetTCPConnection -LocalPort 8099 -ErrorAction SilentlyContinue

if (-not $Connections) {
    Write-Host "No process is using port 8099." -ForegroundColor Yellow
    return
}

$Pids = $Connections | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($pid in $Pids) {
    if ($pid -and $pid -ne 0) {
        try {
            Stop-Process -Id $pid -Force
            Write-Host "Stopped process on port 8099. PID: $pid" -ForegroundColor Green
        } catch {
            Write-Host "Failed to stop PID $pid" -ForegroundColor Red
        }
    }
}