[CmdletBinding()]
param(
    [string]$UbuntuHost = "192.168.50.242",
    [string]$SshUser = "sire",
    [string]$RemotePath = "~/family-dashboard-codex"
)

$ErrorActionPreference = "Stop"

if ($UbuntuHost -notmatch '^[A-Za-z0-9.-]+$') {
    throw "UbuntuHost contains unsupported characters."
}
if ($SshUser -notmatch '^[A-Za-z0-9_-]+$') {
    throw "SshUser contains unsupported characters."
}
if ($RemotePath -notmatch '^[A-Za-z0-9_~./-]+$') {
    throw "RemotePath contains unsupported characters."
}

$ssh = Get-Command ssh.exe -ErrorAction SilentlyContinue
if (-not $ssh) {
    throw "Windows OpenSSH is not installed or ssh.exe is not available on PATH."
}

$target = "$SshUser@$UbuntuHost"
$remoteCommand = @"
set -Eeuo pipefail
cd $RemotePath
echo "Connected to `$(hostname)."
echo "Updating source from GitHub..."
git pull --ff-only origin main
chmod +x ops/update-dashboard.sh
echo "Building and deploying the dashboard..."
./ops/update-dashboard.sh
"@

Write-Host "Connecting to $target..." -ForegroundColor Cyan
Write-Host "Enter the Ubuntu password if SSH requests it." -ForegroundColor DarkGray

& $ssh.Source `
    -tt `
    -o ConnectTimeout=10 `
    -o ServerAliveInterval=15 `
    -o ServerAliveCountMax=4 `
    $target `
    $remoteCommand

if ($LASTEXITCODE -ne 0) {
    throw "Remote deployment exited with code $LASTEXITCODE."
}

$dashboardUrl = "http://${UbuntuHost}:8099/"
Write-Host "Dashboard is available at $dashboardUrl" -ForegroundColor Green
