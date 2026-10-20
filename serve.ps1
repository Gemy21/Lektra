# Local test server for Lektra.
# localhost counts as a secure context, so the service worker and
# "Install app" both work here while you test on the PC.
# Note: on your *phone* over the LAN this is plain http, so Chrome will NOT
# offer to install it there - host it on GitHub Pages / Netlify for that.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$port = 8080

function Find-Python {
  $cands = @()
  Get-Command python -ErrorAction SilentlyContinue | ForEach-Object { $cands += $_.Source }
  Get-ChildItem (Join-Path $env:LOCALAPPDATA "Programs\Python") -Filter python.exe -Recurse -ErrorAction SilentlyContinue |
    ForEach-Object { $cands += $_.FullName }
  $cands | Where-Object { $_ -and ($_ -notlike "*WindowsApps*") } | Select-Object -First 1
}

$py = Find-Python
if (-not $py) {
  Write-Warning "Python not found. Install Python, or use any static server, then open http://localhost:$port"
  exit 1
}

Write-Host "Serving $root" -ForegroundColor Cyan
Write-Host "Open http://localhost:$port   (Ctrl+C to stop)" -ForegroundColor Cyan

# dev-server.py sends Cache-Control: no-store, so a plain reload always shows
# your latest edits. Fall back to the plain server if it is missing.
$devServer = Join-Path $root "dev-server.py"
if (Test-Path $devServer) {
  & $py $devServer $port $root
} else {
  & $py -m http.server $port --directory $root
}
