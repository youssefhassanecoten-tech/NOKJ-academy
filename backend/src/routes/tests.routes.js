const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM tests ORDER BY id");
    return res.json({ tests: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.post("/", requireAuth, requireRole("Teacher"), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.title) {
      return res.status(400).json({ error: "Title is required" });
    }
    const questions = body.questions !== undefined ? body.questions : [];
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: "questions must be an array" });
    }
    const result = await pool.query(
      "INSERT INTO tests (title, course_id, created_by, questions, deadline) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [body.title, body.courseId || null, req.user.id, questions, body.deadline || null]
    );
    return res.status(201).json({ test: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.post("/:id/submit", requireAuth, requireRole("Student"), async (req, res, next) => {
  try {
    const body = req.body || {};
    const answers = body.answers !== undefined ? body.answers : {};
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "answers must be an array or object" });
    }
    const testResult = await pool.query("SELECT * FROM tests WHERE id = $1", [req.params.id]);
    const test = testResult.rows[0];
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }
    const questions = Array.isArray(test.questions) ? test.questions : [];
    let correct = 0;
    questions.forEach((question, index) => {
      if (!question) {
        return;
      }
      const expected = question.correct !== undefined ? question.correct : question.correctAnswer;
      let given;
      if (Array.isArray(answers)) {
        given = answers[index];
      } else {
        given = answers[index] !== undefined ? answers[index] : answers[String(index)];
      }
      if (expected === undefined || given === undefined) {
        return;
      }
      if (String(given) === String(expected)) {
        correct += 1;
      }
    });
    const total = questions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const result = await pool.query(
      "INSERT INTO test_submissions (test_id, student_id, answers, score) VALUES ($1, $2, $3, $4) RETURNING *",
      [test.id, req.user.id, answers, score]
    );
    const submission = Object.assign({}, result.rows[0], { correct, total });
    return res.status(201).json({ submission });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
