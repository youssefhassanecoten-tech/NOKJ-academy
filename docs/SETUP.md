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