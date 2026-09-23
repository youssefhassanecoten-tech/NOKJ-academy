# Database

NOKJ Academy uses **PostgreSQL** as the primary store. The schema in
`database/schema.sql` mirrors the frontend `localStorage` model so the same
entities exist on both layers.

## Layout

```
database/
├── schema.sql          # Full DDL (idempotent, run by docker-init and manually)
├── migrations/         # Versioned migrations
│   └── 0001_initial.sql
└── seeds/
    └── dev.sql         # Demo data (matches the in-browser demo)
```

## Entities

- `users` - Admin / Teacher / Student with role and status
- `courses` + `enrollments` - courses and their student enrollments
- `meetings` - live class schedule (title, teacher, date/time, duration)
- `tasks` + `task_submissions` - homework/assignments/tests with grading
- `tests` + `test_submissions` - quiz builder questions (JSONB) and scores
- `grades` - per-student/per-course grades (0-100)
- `budget_entries` - income/expense ledger

## Conventions

- Tables are `snake_case`, plural.
- `created_at / updated_at` on mutable tables; `updated_at` via trigger.
- JSONB for flexible payloads (`files`, `questions`, `answers`).
- Passwords in seed data are plaintext **for demo only**; production must hash.

## Docker

The `postgres` service in `docker-compose.yml` auto-loads `schema.sql` then
`seeds/dev.sql` on first boot via `/docker-entrypoint-initdb.d/`.

## Next milestones

- [ ] Structured migrations runner (node-pg-migrate)
- [ ] Mongo variant mapping for the optional `MONGO_URL` mode