WITH buckets AS (
  SELECT '0-49' AS bucket, 0 AS lo, 49 AS hi
  UNION ALL SELECT '50-69', 50, 69
  UNION ALL SELECT '70-84', 70, 84
  UNION ALL SELECT '85-100', 85, 100
)
SELECT c.name AS course, b.bucket, COUNT(g.id) AS students
FROM courses c
CROSS JOIN buckets b
LEFT JOIN grades g ON g.course_id = c.id AND g.grade BETWEEN b.lo AND b.hi
GROUP BY c.id, c.name, b.bucket, b.lo
ORDER BY c.name, b.lo;