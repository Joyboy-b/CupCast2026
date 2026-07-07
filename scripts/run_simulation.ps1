$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $env:LocalAppData "Programs\Python\Python312\python.exe"

if (-not (Test-Path $python)) {
  $python = "python"
}

$iterations = if ($args.Count -gt 0) { $args[0] } else { "10000" }

Push-Location $root
try {
  & $python scripts\run_simulation.py --iterations $iterations
} finally {
  Pop-Location
}
