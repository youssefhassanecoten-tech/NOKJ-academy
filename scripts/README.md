# Tooling scripts

PowerShell helpers for day-to-day work. Run from the repository root.

| Script | Purpose |
| --- | --- |
| `dev.ps1` | Serve the frontend on :8080 with auto-restart npm tools |
| `build.ps1` | Run integrity tests + lint; verify all JS syntax |
| `deploy.ps1` | Tag a release and push (optionally `docker compose up --build -d`) |

Aliases: `.\scripts\dev.ps1`, `powershell -ExecutionPolicy Bypass -File scripts\dev.ps1`.