# Documentation

Welcome to the NOKJ Academy documentation.

## Getting started

- [Setup](SETUP.md) - local dev, Docker, and production installation
- [User guide](USER-GUIDE.md) - demo accounts and how the platform works
- [Architecture](ARCHITECTURE.md) - system design and frontend module map
- [API reference](API.md) - backend REST endpoints
- [Database](DATABASE.md) - schema, seed data and migrations
- [Contributing](CONTRIBUTING.md) - workflow and code style
- [Changelog](CHANGELOG.md) - version history

## Contents overview

| Path | Purpose |
| --- | --- |
| `frontend/` | Client-side SPA (vanilla JS + localStorage) |
| `backend/` | Express REST API |
| `database/` | PostgreSQL schema, seeds and migrations |
| `task-constructor/` | Standalone test/task builder prototype |
| `meeting-room/` | WebRTC live-class room prototype |
| `analytics/` | SQL and script-based reporting |
| `tests/` | Integrity + syntax test harness |
| `deployment/` | Nginx config and Docker helpers |