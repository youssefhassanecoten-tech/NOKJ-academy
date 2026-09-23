const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const cwd = process.cwd();
const candidates = [cwd, path.join(cwd, "..")];
let root = null;

for (let i = 0; i < candidates.length; i++) {
  if (fs.existsSync(path.join(candidates[i], "database", "schema.sql"))) {
    root = candidates[i];
    break;
  }
}

if (!root) {
  console.error("database/schema.sql not found. Run this script from the repository root.");
  process.exit(1);
}

const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const options = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || "localhost",
      port: parseInt(process.env.PGPORT || "5432", 10),
      user: process.env.PGUSER || "nokj",
      password: process.env.PGPASSWORD || "nokj",
      database: process.env.PGDATABASE || "nokj_academy"
    };

const schema = fs.readFileSync(path.join(root, "database", "schema.sql"), "utf8");
const seeds = fs.readFileSync(path.join(root, "database", "seeds", "dev.sql"), "utf8");
const client = new Client(options);

client
  .connect()
  .then(() => client.query(schema))
  .then(() => {
    console.log("executed database/schema.sql");
    return client.query(seeds);
  })
  .then(() => {
    console.log("executed database/seeds/dev.sql");
    console.log("database initialized (run from the repository root)");
    return client.end();
  })
  .catch((err) => {
    console.error("database init failed: " + err.message);
    process.exit(1);
  });
