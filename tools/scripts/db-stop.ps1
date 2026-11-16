# WayGo - Detiene el servidor PostgreSQL portable
$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
$pgBin = Join-Path $root "postgresql\bin"
$pgData = Join-Path $root "postgresql\data"

& (Join-Path $pgBin "pg_ctl.exe") -D $pgData status | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "PostgreSQL no esta en ejecucion." -ForegroundColor Yellow
    exit 0
}
& (Join-Path $pgBin "pg_ctl.exe") -D $pgData -m fast -w stop
if ($LASTEXITCODE -eq 0) { Write-Host "PostgreSQL detenido." -ForegroundColor Green }
else { Write-Host "Error al detener PostgreSQL." -ForegroundColor Red; exit 1 }
