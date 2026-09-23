# NOKJ Academy - pre-push build: tests + lint + syntax
$ErrorActionPreference = 'Stop'

node tests/run-tests.cjs
if ($LASTEXITCODE -ne 0) { Write-Error "Integrity tests failed"; exit 1 }

node tests/meta/lint.cjs
if ($LASTEXITCODE -ne 0) { Write-Error "Lint failed"; exit 1 }

Write-Host "Build checks passed." -ForegroundColor Green