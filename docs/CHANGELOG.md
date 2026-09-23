# Changelog

All notable changes are tracked here. Format based on Keep a Changelog.

## [Unreleased]

### Added
- Backend scaffold (Express REST API: auth, users, courses, meetings, tasks,
  tests, grades, budget).
- **WebSocket signalling hub** (`backend/src/ws/signaling.js`, `ws` package)
  for the WebRTC virtual classroom; mounted on the same HTTP server at `/ws`.
- PostgreSQL schema, baseline migration, and demo seed data.
- Task constructor prototype directory.
- Meeting room (WebRTC) prototype directory.
- Analytics reporting directory.
- Test harness (`npm test`, `npm run lint`) verifying frontend integrity.
- Docker Compose stack (postgres + api + nginx web).
- GitHub Actions CI workflow.

### Changed
- **Live classroom is now a real WebRTC mesh** (`frontend/scripts/modules/meeting.js`):
  `getUserMedia` local video/audio, `getDisplayMedia` screen share with
  `RTCPeerConnection`/`replaceTrack`, STUN ICE candidates, chat + slide sync and
  participant presence over WebRTC. Signalling uses the Node WebSocket server
  when reachable, with a `BroadcastChannel` fallback for local/static hosting.
  Join buttons open the meeting room instead of the static presentation player.
- **Role-based color themes**: `admin` (purple, default), `teacher` (red),
  `student` (blue). Applied via `[data-theme]` CSS variables set on login;
  hardcoded purple gradients replaced with `var(--primary)`.
- **De-hardcoded data**: dashboard, timetable, assignments and announcements are
  rendered from stored data (meetings, tasks, grades, announcements) instead of
  static markup. Announcements support full admin CRUD (add/edit/delete) via the
  existing modal system.
- **Working global search**: topbar search indexes courses, lessons, meetings,
  tasks, students and announcements and navigates results.
- **Complete translation pass**: rewrite of `translations.js` to a keyed EN/RU
  dictionary with a `tr()` helper; data-driven pages, buttons, table rows,
  statuses, alerts and navigation now translate, not just static text.

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