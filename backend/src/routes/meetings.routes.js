const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM meetings ORDER BY date, time");
    return res.json({ meetings: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.post("/", requireAuth, requireRole("Teacher"), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.title || !body.date || !body.time) {
      return res.status(400).json({ error: "Title, date and time are required" });
    }
    const teacherId = body.teacherId !== undefined ? body.teacherId : req.user.id;
    const duration = body.duration !== undefined ? body.duration : 60;
    const result = await pool.query(
      "INSERT INTO meetings (title, teacher_id, date, time, duration, link) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [body.title, teacherId, body.date, body.time, duration, body.link || null]
    );
    return res.status(201).json({ meeting: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id", requireAuth, requireRole("Teacher"), async (req, res, next) => {
  try {
    const body = req.body || {};
    const sets = [];
    const values = [];
    const fields = ["title", "date", "time", "duration", "link"];
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
      `UPDATE meetings SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    return res.json({ meeting: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", requireAuth, requireRole("Teacher"), async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM meetings WHERE id = $1 RETURNING *", [req.params.id]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    return res.json({ meeting: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
