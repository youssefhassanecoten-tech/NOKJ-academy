-- ============================================================================
-- NOKJ Academy - PostgreSQL schema
-- Mirrors the frontend localStorage model (see frontend/scripts/config.js)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Users (students, teachers, admins)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('Admin', 'Teacher', 'Student')),
  status      TEXT NOT NULL DEFAULT 'Active'
              CHECK (status IN ('Active', 'Warning', 'Suspended')),
  avatar      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Courses and enrollments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  teacher_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS enrollments (
  course_id   INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  student_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Meetings (live classes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  date       DATE NOT NULL,
  time       TIME NOT NULL,
  duration   INTEGER NOT NULL DEFAULT 60,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Tasks and submissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('homework', 'assignment', 'test')),
  description TEXT,
  deadline    DATE NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('low', 'medium', 'high')),
  course_id   INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  files       JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_submissions (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  student_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  answer      TEXT,
  files       JSONB NOT NULL DEFAULT '[]',
  grade       INTEGER,
  feedback    TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Tests (test builder) and submissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tests (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  course_id   INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  questions   JSONB NOT NULL DEFAULT '[]',
  deadline    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_submissions (
  id          SERIAL PRIMARY KEY,
  test_id     INTEGER REFERENCES tests(id) ON DELETE CASCADE,
  student_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  answers     JSONB NOT NULL DEFAULT '[]',
  score       INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Grades
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grades (
  student_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  grade       INTEGER NOT NULL CHECK (grade BETWEEN 0 AND 100),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, course_id)
);

-- ---------------------------------------------------------------------------
-- Budget
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_entries (
  id         SERIAL PRIMARY KEY,
  category   TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('Income', 'Expense')),
  amount     NUMERIC(12, 2) NOT NULL,
  date       DATE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'Paid',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
CREATE INDEX IF NOT EXISTS idx_tasks_course ON tasks(course_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_submissions_task ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_tests_course ON tests(course_id);
CREATE INDEX IF NOT EXISTS idx_budget_date ON budget_entries(date);