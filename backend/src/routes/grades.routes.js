const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    let sql = "SELECT g.*, u.name AS student_name, c.name AS course_name FROM grades g LEFT JOIN users u ON u.id = g.student_id LEFT JOIN courses c ON c.id = g.course_id";
    const params = [];
    if (req.user.role === "Student") {
      sql += " WHERE g.student_id = $1";
      params.push(req.user.id);
    }
    sql += " ORDER BY g.student_id, g.course_id";
    const result = await pool.query(sql, params);
    return res.json({ grades: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.put("/:studentId/:courseId", requireAuth, requireRole("Teacher"), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (body.grade === undefined || body.grade === null) {
      return res.status(400).json({ error: "grade is required" });
    }
    const grade = Number(body.grade);
    if (!Number.isInteger(grade) || grade < 0 || grade > 100) {
      return res.status(400).json({ error: "grade must be an integer between 0 and 100" });
    }
    const student = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'Student'", [req.params.studentId]);
    if (!student.rows[0]) {
      return res.status(404).json({ error: "Student not found" });
    }
    const course = await pool.query("SELECT id FROM courses WHERE id = $1", [req.params.courseId]);
    if (!course.rows[0]) {
      return res.status(404).json({ error: "Course not found" });
    }
    const result = await pool.query(
      "INSERT INTO grades (student_id, course_id, grade) VALUES ($1, $2, $3) ON CONFLICT (student_id, course_id) DO UPDATE SET grade = EXCLUDED.grade, updated_at = NOW() RETURNING *",
      [req.params.studentId, req.params.courseId, grade]
    );
    return res.json({ grade: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
