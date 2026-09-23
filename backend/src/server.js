const app = require("./app");
const config = require("./config");
const pool = require("./db/pool");
const { attachSignalingServer } = require("./ws/signaling");

const server = app.listen(config.port, () => {
  console.log(`NOKJ Academy API listening on port ${config.port} (${config.nodeEnv})`);
});

attachSignalingServer(server);

server.on("error", (err) => {
  console.error(err.message);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    pool.end(() => {
      process.exit(0);
    });
  });
  setTimeout(() => {
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
