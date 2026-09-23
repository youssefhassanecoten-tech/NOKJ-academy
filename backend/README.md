# NOKJ Academy Backend

Express 4 + PostgreSQL API implementing the REST contract in [docs/API.md](../docs/API.md).

## Run

    npm install
    cp ../../.env.example .env   # or use the repo-root .env
    npm run dev

## Includes

JWT auth, users/students, courses + enrollments, meetings, tasks/submissions,
tests (auto-graded), grades, budget. DB init from the repo root: `npm run db:init`
(applies `database/schema.sql` then `database/seeds/dev.sql`).
