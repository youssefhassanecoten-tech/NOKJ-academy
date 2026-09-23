# API

The backend is an Express scaffold mirroring the frontend entities. All routes
are prefixed `/api`. Production endpoints require `Authorization: Bearer <jwt>`.

## Auth

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ token, user }` |
| POST | `/api/auth/register` | `{ name, email, password, role }` | Creates an account |
| GET | `/api/auth/me` | - | Current user profile |

## Users & students

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/users` | List users (admin) |
| GET | `/api/students` | List students (admin/teacher) |
| POST | `/api/students` | Create student (admin) |
| PATCH | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Remove student |

## Courses

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/courses` | List courses |
| POST | `/api/courses` | Create course (teacher/admin) |
| PATCH | `/api/courses/:id` | Update course |
| POST | `/api/courses/:id/enroll` | `{ studentId }` enroll a student |
| DELETE | `/api/courses/:id/enroll/:studentId` | Unenroll |

## Meetings (live classes)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/meetings` | List meetings |
| POST | `/api/meetings` | Create meeting (teacher) |
| PATCH | `/api/meetings/:id` | Update meeting |
| DELETE | `/api/meetings/:id` | Cancel meeting |

## Tasks

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task (teacher) |
| GET | `/api/tasks/:id/submissions` | List submissions |
| POST | `/api/tasks/:id/submit` | Student submits |
| PATCH | `/api/submissions/:id/grade` | Grade a submission |

## Tests

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/tests` | List tests |
| POST | `/api/tests` | Create test with questions |
| POST | `/api/tests/:id/submit` | Submit answers, get score |

## Grades

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/grades` | Grades for current user / course |
| PUT | `/api/grades/:studentId/:courseId` | Set grade (teacher) |

## Budget

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/budget` | Income/expense entries |
| POST | `/api/budget` | Add entry (admin) |
| DELETE | `/api/budget/:id` | Delete entry |

## Error format

```json
{ "error": "message" }
```

Status codes: `400` bad request, `401` unauthenticated, `403` forbidden,
`404` not found, `500` server error.