SELECT 'users_by_role' AS metric, role AS name, COUNT(*) AS value
FROM users
GROUP BY role
ORDER BY role;

SELECT 'meetings_per_month' AS metric, TO_CHAR(date_trunc('month', date), 'YYYY-MM') AS name, COUNT(*) AS value
FROM meetings
GROUP BY date_trunc('month', date)
ORDER BY 2;

SELECT 'submissions_per_task' AS metric, t.title AS name, COUNT(ts.id) AS value
FROM tasks t
LEFT JOIN task_submissions ts ON ts.task_id = t.id
GROUP BY t.id, t.title
ORDER BY t.title;

SELECT 'avg_grade_per_course' AS metric, c.name AS name, COALESCE(ROUND(AVG(g.grade), 1), 0) AS value
FROM courses c
LEFT JOIN grades g ON g.course_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;