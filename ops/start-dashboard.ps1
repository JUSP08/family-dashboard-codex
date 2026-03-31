$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RepoRoot "backend"
$FrontendDir = Join-Path $RepoRoot "frontend"

$VenvPython = Join-Path $RepoRoot "backend\.venv\Scripts\python.exe"
$PythonExe = if (Test-Path $VenvPython) { $VenvPython } else { "python" }

Write-Host "== Family Dashboard Windows: START ==" -ForegroundColor Cyan
Write-Host "RepoRoot: $RepoRoot"
Write-Host "BackendDir: $BackendDir"
Write-Host "FrontendDir: $FrontendDir"
Write-Host "PythonExe: $PythonExe"

$DistIndex = Join-Path $FrontendDir "dist\index.html"
if (-not (Test-Path $DistIndex)) {
    Write-Host "Frontend build not found. Running npm run build..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    npm run build
    Pop-Location
}

$PortBusy = $false
try {
    $conn = Get-NetTCPConnection -LocalPort 8099 -ErrorAction Stop
    if ($conn) {
        $PortBusy = $true
        Write-Host "Port 8099 is already in use." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Port 8099 is free."
}

if (-not $PortBusy) {
    Write-Host "Starting backend..." -ForegroundColor Yellow
    Push-Location $BackendDir
    $proc = Start-Process -FilePath $PythonExe -ArgumentList "app.py" -WorkingDirectory $BackendDir -PassThru
    Pop-Location
    Write-Host "Started backend PID: $($proc.Id)" -ForegroundColor Green
} else {
    Write-Host "Skipping backend start because port 8099 is already busy." -ForegroundColor Yellow
}

$HealthUrl = "http://127.0.0.1:8099/health"
$MaxAttempts = 20
$Ready = $false

for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 2
        if ($resp.status -eq "ok") {
            $Ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $Ready) {
    throw "Backend did not become healthy on $HealthUrl"
}

Write-Host "Backend is healthy. Opening browser..." -ForegroundColor Green
Start-Process "http://127.0.0.1:8099/"