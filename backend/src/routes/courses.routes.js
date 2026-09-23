const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    let result;
    if (req.user.role === "Student") {
      result = await pool.query(
        "SELECT c.* FROM courses c JOIN enrollments e ON e.course_id = c.id WHERE e.student_id = $1 ORDER BY c.id",
        [req.user.id]
      );
    } else {
      result = await pool.query("SELECT * FROM courses ORDER BY id");
    }
    return res.json({ courses: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.post("/", requireAuth, requireRole("Teacher", "Admin"), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.name) {
      return res.status(400).json({ error: "Course name is required" });
    }
    const teacherId = body.teacherId !== undefined ? body.teacherId : req.user.id;
    const result = await pool.query(
      "INSERT INTO courses (name, description, teacher_id) VALUES ($1, $2, $3) RETURNING *",
      [body.name, body.description || null, teacherId]
    );
    return res.status(201).json({ course: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id", requireAuth, requireRole("Teacher", "Admin"), async (req, res, next) => {
  try {
    const body = req.body || {};
    const sets = [];
    const values = [];
    const fields = ["name", "description"];
    for (const field of fields) {
      if (body[field] !== undefined) {
        values.push(body[field]);
        sets.push(field + " = $" + values.length);
      }
    }
    if (body.teacherId !== undefined) {
      values.push(body.teacherId);
      sets.push("teacher_id = $" + values.length);
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE courses SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Course not found" });
    }
    return res.json({ course: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.post("/:id/enroll", requireAuth, requireRole("Teacher", "Admin"), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.studentId) {
      return res.status(400).json({ error: "studentId is required" });
    }
    const course = await pool.query("SELECT id FROM courses WHERE id = $1", [req.params.id]);
    if (!course.rows[0]) {
      return res.status(404).json({ error: "Course not found" });
    }
    const student = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'Student'", [body.studentId]);
    if (!student.rows[0]) {
      return res.status(404).json({ error: "Student not found" });
    }
    const result = await pool.query(
      "INSERT INTO enrollments (course_id, student_id) VALUES ($1, $2) RETURNING *",
      [req.params.id, body.studentId]
    );
    return res.status(201).json({ enrollment: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id/enroll/:studentId", requireAuth, requireRole("Teacher", "Admin"), async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM enrollments WHERE course_id = $1 AND student_id = $2 RETURNING *",
      [req.params.id, req.params.studentId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Enrollment not found" });
    }
    return res.json({ enrollment: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
