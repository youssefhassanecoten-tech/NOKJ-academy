const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const userColumns = "id, name, email, role, status, avatar, created_at, updated_at";
const roles = ["Admin", "Teacher", "Student"];
const statuses = ["Active", "Warning", "Suspended"];

async function updateUser(req, res, next) {
  try {
    const body = req.body || {};
    if (body.role !== undefined && roles.indexOf(body.role) === -1) {
      return res.status(400).json({ error: "Invalid role" });
    }
    if (body.status !== undefined && statuses.indexOf(body.status) === -1) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const sets = [];
    const values = [];
    const textFields = ["name", "email", "role", "status", "avatar"];
    for (const field of textFields) {
      if (body[field] !== undefined) {
        values.push(body[field]);
        sets.push(field + " = $" + values.length);
      }
    }
    if (body.password !== undefined && body.password !== "") {
      const hash = await bcrypt.hash(body.password, 10);
      values.push(hash);
      sets.push("password = $" + values.length);
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING ${userColumns}`,
      values
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, name, email, role",
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

router.get("/users", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT ${userColumns} FROM users ORDER BY id`);
    return res.json({ users: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.get("/students", requireAuth, requireRole("Admin", "Teacher"), async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT ${userColumns} FROM users WHERE role = 'Student' ORDER BY id`);
    return res.json({ students: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.post("/students", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.name || !body.email || !body.password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    const status = body.status !== undefined ? body.status : "Active";
    if (statuses.indexOf(status) === -1) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const hash = await bcrypt.hash(body.password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, 'Student', $4) RETURNING ${userColumns}`,
      [body.name, body.email, hash, status]
    );
    return res.status(201).json({ student: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.patch("/users/:id", requireAuth, requireRole("Admin"), updateUser);
router.patch("/students/:id", requireAuth, requireRole("Admin"), updateUser);
router.delete("/users/:id", requireAuth, requireRole("Admin"), deleteUser);
router.delete("/students/:id", requireAuth, requireRole("Admin"), deleteUser);

module.exports = router;
