# Changelog

All notable changes are tracked here. Format based on Keep a Changelog.

## [Unreleased]

### Added
- Backend scaffold (Express REST API: auth, users, courses, meetings, tasks,
  tests, grades, budget).
- PostgreSQL schema, baseline migration, and demo seed data.
- Task constructor prototype directory.
- Meeting room (WebRTC) prototype directory.
- Analytics reporting directory.
- Test harness (`npm test`, `npm run lint`) verifying frontend integrity.
- Docker Compose stack (postgres + api + nginx web).
- GitHub Actions CI workflow.

## [2.0.0] - 2026-09-23

### Changed
- Restructured the single-file SPA (`index.html`, ~230 KB) into a modular
  monorepo while keeping behavior identical.
- Split CSS into `frontend/styles/` (variables, main, per-page, per-component).
- Split JS into `frontend/scripts/` (config, utils, translations, router,
  auth, 12 modules, app) with verified content parity.
- Extracted page fragments into `frontend/pages/`.

## [1.x] - legacy

Single-file application. Preserved on the `v1-legacy` branch.
Initial release: landing page, auth (login/register), dashboards per role,
timetable, calendar, courses, assignments, announcements, classroom (meetings +
presentation player), tasks with submissions and file uploads, test builder,
grades, students management, budget, profile, EN/RU language switcher.