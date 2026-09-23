# NOKJ Academy - local dev server
param(
  [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
Write-Host "Starting frontend on http://localhost:$Port" -ForegroundColor Green
npx --yes serve frontend -l $Port