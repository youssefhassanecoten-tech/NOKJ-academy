const jwt = require("jsonwebtoken");
const config = require("../config");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.slice(0, 7) === "Bearer " ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.user = { id: payload.id, role: payload.role, email: payload.email };
  return next();
}

function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user || roles.indexOf(req.user.role) === -1) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
