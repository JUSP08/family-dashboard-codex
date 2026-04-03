$ErrorActionPreference = "Stop"

$StopScript = Join-Path $PSScriptRoot "stop-dashboard.ps1"
$StartScript = Join-Path $PSScriptRoot "start-dashboard.ps1"

function Stop-ProcessOnPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if (-not $connections) {
            Write-Host "No listening process found on port $Port." -ForegroundColor DarkGray
            return
        }

        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $pids) {
            try {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "Killing port $Port owner: PID $pid ($($proc.ProcessName))" -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force -ErrorAction Stop
                } else {
                    Write-Host "Killing port $Port owner: PID $pid" -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force -ErrorAction Stop
                }
            } catch {
                Write-Warning "Failed to stop PID $pid on port $Port : $($_.Exception.Message)"
            }
        }

        Start-Sleep -Milliseconds 500
    } catch {
        Write-Warning "Port kill check failed for port $Port : $($_.Exception.Message)"
    }
}

Write-Host "== Family Dashboard Windows: RESTART ==" -ForegroundColor Cyan

& $StopScript
Start-Sleep -Seconds 2

Write-Host "Ensuring port 8099 is free..." -ForegroundColor Cyan
Stop-ProcessOnPort -Port 8099

& $StartScript