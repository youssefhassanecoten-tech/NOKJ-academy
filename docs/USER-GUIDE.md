# User guide

## Signing in

Use one of the demo accounts on the landing page:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@nokj.com` | `admin123` |
| Student | `student@nokj.com` | `password123` |
| Teacher | `wilson@nokj.com` | `password123` |
| Teacher | `evans@nokj.com` | `password123` |

The "Join Academy" flow lets you register as a student; the demo accounts are
also auto-created on first load.

## Tabs

- **Dashboard** - personalized home depending on role.
- **Timetable / Calendar** - weekly schedule and month view of meetings/tasks.
- **Courses** - browse courses; teachers manage the course catalog
  (`courses-admin`).
- **Assignments & Tasks** - teachers create tasks (homework/assignment/test),
  students submit answers/files; teachers grade with feedback.
- **Announcements** - class announcements.
- **Classroom** - live meetings with a in-app presentation player; teachers can
  present slides and (stub) share the screen.
- **Tests** - test builder (multiple question types), taking quizzes, and
  auto-grading.
- **Students** (admin) - manage student records and status.
- **Budget** (admin) - track income and expenses.
- **Grades** - grade view per course; teachers can grade on the fly.
- **Profile** - view/edit profile, change avatar (stored in browser).

## Language

Use the EN/RU switcher in the navigation; all visible strings are translated.

## Data & reset

Everything is stored in `localStorage` (key `nokj_data`). To reset the demo,
clear site data for the app or call the internal seed function on the console
(`localStorage.removeItem('nokj_data')` then reload).