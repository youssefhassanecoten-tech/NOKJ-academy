const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const config = require("./config");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

const allowedOrigins = config.corsOrigin.split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

if (config.nodeEnv !== "test") {
  app.use(morgan("dev"));
}

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
