# analytics

Reporting tooling for NOKJ Academy.

## Reports

- `queries/usage.sql` - counts of users by role, meetings per month,
  submissions per task, and average grade per course (joins `users`,
  `courses`, `meetings`, `task_submissions`, `grades`).
- `queries/grades.sql` - grade distribution per course split into buckets
  (0-49, 50-69, 70-84, 85-100).

## Aggregator

`scripts/aggregate.cjs` runs both queries against PostgreSQL and prints a
small text report table to stdout.

```bash
npm install pg        # from the monorepo root
node scripts/aggregate.cjs
```

It expects the standard `PG*` env vars (`PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD`, `PGDATABASE`) for the `pg` Pool connection. Exit code is 0 on
success.