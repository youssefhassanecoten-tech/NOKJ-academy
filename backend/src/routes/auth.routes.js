const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.email || !body.password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [body.email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    let valid = false;
    try {
      valid = await bcrypt.compare(body.password, user.password);
    } catch (err) {
      valid = false;
    }
    if (!valid && body.password === user.password) {
      valid = true;
    }
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.name || !body.email || !body.password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    const roles = ["Admin", "Teacher", "Student"];
    const role = body.role || "Student";
    if (roles.indexOf(role) === -1) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const hash = await bcrypt.hash(body.password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, 'Active') RETURNING id, name, email, role, status",
      [body.name, body.email, hash, role]
    );
    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, status, avatar, created_at, updated_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
