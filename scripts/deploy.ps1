# NOKJ Academy - deploy helper
param(
  [string]$Tag = "",
  [switch]$Docker
)

$ErrorActionPreference = 'Stop'

if ($Tag -eq "") {
  $Tag = "v" + (Get-Date -Format "yyyy.MM.dd")
}

git tag $Tag
if ($LASTEXITCODE -ne 0) { Write-Error "Tag failed"; exit 1 }
git push origin $Tag

if ($Docker) {
  docker compose up --build -d
  if ($LASTEXITCODE -ne 0) { Write-Error "Docker deploy failed"; exit 1 }
}

Write-Host "Deployed as $Tag" -ForegroundColor Green