# NOKJ Academy

All-in-one learning platform for schools: live classes, homework and tests, grades, classroom management, and budget tracking.

## Features

- **Live classes** - Join teacher-hosted online sessions, screen sharing, real-time chat (WebRTC)
- **Smart tasks** - Homework, assignments and tests with file uploads, submissions and grading
- **Progress tracking** - Grades, attendance and per-course progress dashboards
- **Classroom** - Announcements, course materials and classroom pages
- **Admin tools** - Student management, courses, and budget (income/expenses)
- **Multi-language** - English and Russian (EN/RU)
- **Role-based access** - Admin, Teacher and Student views

## Demo accounts

| Role    | Email              | Password    |
| ------- | ------------------ | ----------- |
| Admin   | `admin@nokj.com`   | `admin123`  |
| Student | `student@nokj.com` | `password123` |
| Teacher | `wilson@nokj.com`  | `password123` |
| Teacher | `evans@nokj.com`   | `password123` |

## Tech stack

- **Frontend** - HTML, CSS, vanilla JavaScript (no build step required)
- **Meetings** - WebRTC + Socket.io
- **Backend** - Node.js, Express
- **Database** - PostgreSQL (primary) / MongoDB (optional)
- **Deployment** - Docker, Nginx
- **CI/CD** - GitHub Actions

## Repository layout

```
NOKJ-academy/
├── frontend/          # SPA: index.html, styles/, scripts/, pages/
├── backend/           # Express API (routes, controllers, models, middleware)
├── database/          # schema.sql, migrations/, seeds/
├── docs/              # Architecture, API, database, setup and user guides
├── task-constructor/  # Test builder tooling
├── meeting-room/      # WebRTC live-class room
├── analytics/         # Usage and grade analytics reports
├── tests/             # Integrity and regression test harness
├── scripts/           # Dev / build / deploy helpers
├── deployment/        # Nginx config, Dockerfiles
├── mobile/            # Mobile wrapper notes and plans
└── .github/           # CI workflows
```

## Quick start (frontend only)

The app is fully client-side (localStorage) and needs no server:

```bash
npx serve frontend -l 8080
# open http://localhost:8080
```

## Quick start (full stack, Docker)

```bash
docker compose up --build
# web:     http://localhost:8080
# api:     http://localhost:3000
```

The first start initializes the database from `database/schema.sql` and seed data.

## Manual backend setup

```bash
npm install
cp .env.example .env
npm run dev
```

See [docs/SETUP.md](docs/SETUP.md) for details.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Database](docs/DATABASE.md)
- [Setup](docs/SETUP.md)
- [User guide](docs/USER-GUIDE.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Changelog](docs/CHANGELOG.md)

## Version history

- **v1.x** (single-file SPA) is preserved on the `v1-legacy` branch.
- **v2.x** (current `main`) is the modular monorepo restructure of the same app.