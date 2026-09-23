const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const entryTypes = ["Income", "Expense"];

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM budget_entries ORDER BY date, id");
    return res.json({ entries: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.post("/", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.category || !body.type || body.amount === undefined || !body.date) {
      return res.status(400).json({ error: "Category, type, amount and date are required" });
    }
    if (entryTypes.indexOf(body.type) === -1) {
      return res.status(400).json({ error: "type must be Income or Expense" });
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount)) {
      return res.status(400).json({ error: "amount must be a number" });
    }
    const result = await pool.query(
      "INSERT INTO budget_entries (category, type, amount, date, status, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [body.category, body.type, amount, body.date, body.status || "Paid", req.user.id]
    );
    return res.status(201).json({ entry: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM budget_entries WHERE id = $1 RETURNING *", [req.params.id]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Entry not found" });
    }
    return res.json({ entry: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
