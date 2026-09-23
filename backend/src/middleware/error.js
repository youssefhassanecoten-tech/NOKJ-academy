function notFound(req, res) {
  res.status(404).json({ error: "Not found" });
}

function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.msg || err.message || "Internal server error";
  if (err.code === "23505") {
    status = 409;
    message = err.msg || "Resource already exists";
  }
  if (err.code === "22P02") {
    status = 400;
    message = err.msg || "Invalid parameter";
  }
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
