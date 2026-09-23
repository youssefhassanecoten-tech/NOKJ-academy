const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const taskTypes = ["homework", "assignment", "test"];
const priorities = ["low", "medium", "high"];

router.get("/tasks", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM tasks ORDER BY id");
    return res.json({ tasks: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.post("/tasks", requireAuth, requireRole("Teacher"), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.title || !body.type || !body.deadline) {
      return res.status(400).json({ error: "Title, type and deadline are required" });
    }
    if (taskTypes.indexOf(body.type) === -1) {
      return res.status(400).json({ error: "Invalid task type" });
    }
    const priority = body.priority !== undefined ? body.priority : "medium";
    if (priorities.indexOf(priority) === -1) {
      return res.status(400).json({ error: "Invalid priority" });
    }
    const files = body.files !== undefined ? body.files : [];
    if (!Array.isArray(files)) {
      return res.status(400).json({ error: "files must be an array" });
    }
    const result = await pool.query(
      "INSERT INTO tasks (title, type, description, deadline, priority, course_id, created_by, files) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [body.title, body.type, body.description || null, body.deadline, priority, body.courseId || null, req.user.id, files]
    );
    return res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.get("/tasks/:id/submissions", requireAuth, async (req, res, next) => {
  try {
    let sql = "SELECT ts.*, u.name AS student_name, u.email AS student_email FROM task_submissions ts LEFT JOIN users u ON u.id = ts.student_id WHERE ts.task_id = $1";
    const params = [req.params.id];
    if (req.user.role === "Student") {
      sql += " AND ts.student_id = $2";
      params.push(req.user.id);
    }
    sql += " ORDER BY ts.id";
    const result = await pool.query(sql, params);
    return res.json({ submissions: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.post("/tasks/:id/submit", requireAuth, requireRole("Student"), async (req, res, next) => {
  try {
    const body = req.body || {};
    const files = body.files !== undefined ? body.files : [];
    if (!Array.isArray(files)) {
      return res.status(400).json({ error: "files must be an array" });
    }
    const task = await pool.query("SELECT id FROM tasks WHERE id = $1", [req.params.id]);
    if (!task.rows[0]) {
      return res.status(404).json({ error: "Task not found" });
    }
    const result = await pool.query(
      "INSERT INTO task_submissions (task_id, student_id, answer, files) VALUES ($1, $2, $3, $4) ON CONFLICT (task_id, student_id) DO UPDATE SET answer = EXCLUDED.answer, files = EXCLUDED.files, submitted_at = NOW() RETURNING *",
      [req.params.id, req.user.id, body.answer || null, files]
    );
    return res.json({ submission: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.patch("/submissions/:id/grade", requireAuth, requireRole("Teacher"), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (body.grade === undefined && body.feedback === undefined) {
      return res.status(400).json({ error: "grade or feedback is required" });
    }
    const sets = [];
    const values = [];
    if (body.grade !== undefined) {
      values.push(body.grade);
      sets.push("grade = $" + values.length);
    }
    if (body.feedback !== undefined) {
      values.push(body.feedback);
      sets.push("feedback = $" + values.length);
    }
    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE task_submissions SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Submission not found" });
    }
    return res.json({ submission: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
