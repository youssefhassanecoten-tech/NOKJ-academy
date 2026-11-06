# Setup

## Prerequisites

- Node.js 18+ (developed on Node 26)
- Docker + Docker Compose (optional, for the full stack)
- PostgreSQL 14+ (optional, for backend)

## Frontend only (no server required)

```bash
npx serve frontend -l 8080
```

Then open http://localhost:8080 and sign in with a demo account:

- `admin@nokj.com` / `admin123`
- `student@nokj.com` / `password123`
- `wilson@nokj.com` / `password123`
- `evans@nokj.com` / `password123`

Data is stored in the browser's `localStorage`, so reloads keep state and no
backend is needed.

## API mode (server-checked accounts)

Point the app at the API and sign-in, registration and sessions go to the
backend instead of the local copy. Course, homework and grade data still lives
in `localStorage` for now.

Add this to `frontend/index.html`, or set the globals before the scripts run:

```html
<meta name="nokj-api-base" content="https://api.example.com">
<meta name="nokj-signaling-url" content="wss://api.example.com/ws">
```

`NOKJ_SIGNALING_URL` is optional: with only an API base, the app assumes the
WebRTC hub is on the same host at `/ws`. Leave both empty to keep the demo build
working exactly as before.

The API needs `CORS_ORIGIN` to include the page's origin, and the account must
exist in the database (see the seeds) — the server does not fall back to the
demo passwords in the browser.

## Backend

```bash
npm install
cp .env.example .env        # then edit values
npm run dev:api
```

The API listens on http://localhost:3000 (see `PORT`).

## Full stack with Docker

```bash
docker compose up --build
```

- Web: http://localhost:8080
- API: http://localhost:3000

The Postgres container initializes from `database/schema.sql` +
`database/seeds/dev.sql` on first run.

## Database manually

```bash
createdb nokj_academy
psql -d nokj_academy -f database/schema.sql
psql -d nokj_academy -f database/seeds/dev.sql
```

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | web + api together |
| `npm run dev:web` | static frontend server on :8080 |
| `npm run dev:api` | Express API on :3000 |
| `npm test` | integrity + syntax tests |
| `npm run lint` | JS-style checks |

## Troubleshooting

- PowerShell cannot run `npm.ps1` scripts? Use `npm.cmd`.
- `ERR_INVALID_PACKAGE_CONFIG` when running Node from a temp/global dir?
  Run from inside the repository (Node resolves the nearest `package.json`).