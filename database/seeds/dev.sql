-- Seed data for local development.
-- Passwords are plaintext for demo only; use hashes in production.

-- Users
INSERT INTO users (name, email, password, role, status) VALUES
  ('Admin User',        'admin@nokj.com',   'admin123',    'Admin',   'Active'),
  ('Alex Student',      'student@nokj.com', 'password123', 'Student', 'Active'),
  ('Sarah Chen',        'sarah@example.com', 'password123', 'Student', 'Active'),
  ('Marcus Webb',       'marcus@example.com', 'password123', 'Student', 'Warning'),
  ('Dr. Wilson',        'wilson@nokj.com',  'password123', 'Teacher', 'Active'),
  ('Ms. Evans',         'evans@nokj.com',   'password123', 'Teacher', 'Active')
ON CONFLICT (email) DO NOTHING;

-- Courses (teachers are 2: Wilson, 3: Evans by id order if fresh insert)
INSERT INTO courses (name, description, teacher_id)
SELECT c.name, c.description, u.id
FROM (VALUES
  ('Mathematics',       'Year 10 Mathematics'),
  ('Biology',           'Year 10 Biology'),
  ('English Literature','Year 10 English Literature')
) AS c(name, description)
CROSS JOIN users u
WHERE u.email = 'wilson@nokj.com'
  AND NOT EXISTS (SELECT 1 FROM courses);

-- Meetings
INSERT INTO meetings (title, teacher_id, date, time, duration)
SELECT m.title, u.id, m.date, m.time, m.duration
FROM (VALUES
  ('Mathematics: Quadratic Equations', '2026-08-28'::date, '15:30'::time, 60),
  ('Biology: Cell Structure',          '2026-08-29'::date, '12:00'::time, 60),
  ('English Literature: Macbeth',      '2026-08-30'::date, '09:00'::time, 60)
) AS m(title, date, time, duration)
CROSS JOIN users u
WHERE u.email = 'wilson@nokj.com'
  AND NOT EXISTS (SELECT 1 FROM meetings);

-- Budget
INSERT INTO budget_entries (category, type, amount, date, status) VALUES
  ('Student Fees',  'Income',  12000, '2026-08-01', 'Paid'),
  ('Staff Salaries','Expense', -8500, '2026-08-05', 'Paid');