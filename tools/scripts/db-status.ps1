# WayGo - Estado del servidor PostgreSQL portable
$root = Resolve-Path "$PSScriptRoot\.."
$pgBin = Join-Path $root "postgresql\bin"
$pgData = Join-Path $root "postgresql\data"
& (Join-Path $pgBin "pg_ctl.exe") -D $pgData status
