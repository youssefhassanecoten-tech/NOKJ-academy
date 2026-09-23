# Architecture

## Overview

NOKJ Academy began as a single-file SPA (`index.html`, ~230 KB) and has been
restructured into a modular monorepo. The application still runs 100% client-side
(localStorage-backed) so a static file server is enough to use it. Backend,
database and deployment layers are scaffolded for the migration toward a
full-stack deployment.

## Frontend (current)

`frontend/index.html` is the entry point. It loads modular assets:

- **Styles** (`frontend/styles/`): `variables.css` (design tokens), `main.css`
  (base), per-page and per-component stylesheets, and `responsive.css`.
- **Scripts** (`frontend/scripts/`), loaded in dependency order:

  | File | Responsibility |
  | --- | --- |
  | `config.js` | Demo accounts, default data, shared mutable state |
  | `utils.js` | DOM helpers, notifications, formatting, storage |
  | `translations.js` | EN/RU dictionaries and `setLanguage()` |
  | `router.js` | `openPage()` view switching |
  | `auth.js` | Login/register, session persistence, role checks |
  | `modules/dashboard.js` | Landing, auth screens, role dashboards |
  | `modules/calendar.js` | Timetable and calendar rendering |
  | `modules/classroom.js` | Meetings, join buttons, scheduling |
  | `modules/meeting.js` | WebRTC virtual classroom (mesh + signalling) |
  | `modules/search.js` | Global topbar search across app data |
  | `modules/announcements.js` | Announcement rendering (+ admin CRUD) |
  | `modules/assignments.js` | Student-facing assignment list |
  | `modules/students.js` | Student administration |
  | `modules/courses.js` | Course and enrollment management |
  | `modules/budget.js` | Budget income/expense tracking |
  | `modules/grades.js` | Grades view and grading |
  | `modules/tasks.js` | Task creation, submissions, file uploads |
  | `modules/tests.js` | Test builder, quiz taking and auto-grading |
  | `modules/files.js` | File preview modal, avatar upload |
  | `modules/modals.js` | Generic modal dialogs, account/profile forms |
  | `app.js` | Init, view wiring, delegated `data-page` navigation |

- **Pages** (`frontend/pages/`): extracted HTML fragments for the 14 views
  (dashboard, timetable, courses, assignments, announcements, classroom, tasks,
  tests, profile, students, budget, courses-admin, grades, calendar).
- **Views** are sections toggled via the `active` CSS class by `router.js`.

### Data model (frontend)

State lives in `localStorage` under `nokj_data`, seeded from `config.js`
defaults on first run: students, teachers, admins, courses, enrollments,
meetings, tasks + submissions, tests + submissions, grades, budget entries,
presentation slides.

### Roles

- **Admin**: everything, including students/budget management.
- **Teacher**: courses, tasks, tests, grading, meetings.
- **Student**: dashboard, calendar, tasks, tests, grades.

## Backend (scaffold)

`backend/` is an Express API scaffold (see [API](API.md)). It mirrors the
frontend entities: auth, users, courses, enrollments, meetings, tasks,
submissions, tests, grades, budget.

### Live classroom signalling

`backend/src/ws/signaling.js` attaches a WebSocket hub (`ws`, path `/ws`) to the
same HTTP server. It relays `join`, `signal` (WebRTC offers/answers/ICE),
`chat`, `slide`, `mic` and `leave` messages inside ephemeral in-memory rooms.
The frontend (`modules/meeting.js`) builds a browser-to-browser
`RTCPeerConnection` mesh over it, falling back to `BroadcastChannel` when the
server is unreachable. See `meeting-room/README.md` for the full design and
LiveKit/Stream/Agora migration path.

## Database

PostgreSQL schema in `database/schema.sql`, with migrations under
`database/migrations/` and demo seed data under `database/seeds/`.
See [Database](DATABASE.md).

## Deployment

- `docker-compose.yml` runs `postgres` + `api` + `web` (Nginx serving
  `frontend/`).
- `deployment/nginx.conf` configures the web container.
- GitHub Actions in `.github/workflows/` runs CI.

## Security & portability

- No secrets committed; use `.env` for credentials (see `.env.example`).
- Browser demo data is self-contained; switching to a server replaces the
  localStorage layer with API calls through the matching endpoints.