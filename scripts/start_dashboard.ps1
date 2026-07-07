$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $env:LocalAppData "Programs\Python\Python312\python.exe"

if (-not (Test-Path $python)) {
  $python = "python"
}

$port = if ($args.Count -gt 0) { $args[0] } else { "8000" }

Push-Location $root
try {
  Write-Host "Serving dashboard at http://127.0.0.1:$port/dashboard/"
  & $python -m http.server $port -b 127.0.0.1
} finally {
  Pop-Location
}
