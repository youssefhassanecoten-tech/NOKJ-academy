const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool();
const queriesDir = path.join(__dirname, "..", "queries");

function loadQuery(name) {
  return fs.readFileSync(path.join(queriesDir, name), "utf8");
}

function pad(text, width) {
  return String(text).padEnd(width);
}

function printTable(rows, headers, widths) {
  if (rows.length > 0) {
    if (headers) {
      console.log(headers.map(function(h, i) { return pad(h, widths[i]); }).join("  "));
      console.log(widths.map(function(w) { return "-".repeat(w); }).join("  "));
    }
    rows.forEach(function(row) {
      const values = widths.map(function(w, i) {
        const key = Object.keys(row)[i];
        return pad(key !== undefined ? row[key] : "", w);
      });
      console.log(values.join("  "));
    });
    console.log("");
  } else {
    console.log("  (no rows)\n");
  }
}

async function run() {
  const usage = await pool.query(loadQuery("usage.sql"));
  console.log("=== Usage report ===");
  const lastMetric = { metric: null };
  usage.rows.forEach(function(row) {
    if (row.metric !== lastMetric.metric) {
      lastMetric.metric = row.metric;
      console.log("\n-- " + row.metric + " --");
    }
    console.log("  " + pad(row.name, 40) + " " + row.value);
  });
  if (usage.rows.length === 0) {
    console.log("  (no rows)");
  }

  console.log("\n=== Grade distribution per course ===");
  const grades = await pool.query(loadQuery("grades.sql"));
  printTable(grades.rows, ["Course", "Bucket", "Students"], [36, 8, 8]);

  await pool.end();
}

run().then(function() {
  process.exit(0);
}).catch(function(err) {
  console.error("Aggregation failed:", err.message);
  process.exit(1);
});