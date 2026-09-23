const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const repoRoot = path.resolve(__dirname, "../../..");
const envPath = path.join(repoRoot, ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:8080",
  db: {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || "nokj",
    password: process.env.PGPASSWORD || "nokj",
    database: process.env.PGDATABASE || "nokj_academy"
  },
  jwt: {
    secret: process.env.JWT_SECRET || "change-me-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  }
};

module.exports = config;
