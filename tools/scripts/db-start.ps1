# WayGo - Inicia el servidor PostgreSQL portable (puerto 5433)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $root) { $root = Split-Path -Parent $PSScriptRoot }
$root = Resolve-Path "$PSScriptRoot\.."
$pgBin = Join-Path $root "postgresql\bin"
$pgData = Join-Path $root "postgresql\data"
$pgLog = Join-Path $root "postgresql\server.log"

& (Join-Path $pgBin "pg_ctl.exe") -D $pgData status | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL ya esta en ejecucion." -ForegroundColor Yellow
    exit 0
}
& (Join-Path $pgBin "pg_ctl.exe") -D $pgData -l $pgLog -o "-p 5433" -w -t 60 start
if ($LASTEXITCODE -eq 0) { Write-Host "PostgreSQL iniciado en 127.0.0.1:5433" -ForegroundColor Green }
else { Write-Host "Error al iniciar PostgreSQL. Revisa $pgLog" -ForegroundColor Red; exit 1 }
