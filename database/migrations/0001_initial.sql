-- Baseline migration. The database is created from database/schema.sql;
-- this migration records the baseline so Flyway/Node-pg-migrate-style
-- tooling can apply consistent versions going forward.

-- 1. Install schema.sql as-is (idempotent).
\i schema.sql

-- 2. Record baseline.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('0001_initial')
ON CONFLICT (version) DO NOTHING;