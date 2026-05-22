const express = require("express");
const masterRegistry = require("./modules/masterRegistry");

const { loadConfig, findServerById } = require("./config/configLoader");
const logger = require("./modules/logger");
const { fail } = require("./modules/response");

const commonRoutes = require("./routes/common.routes");
const dbRoutes = require("./routes/db.routes");

const app = express();

app.use(express.json());

let config;
let currentServer;

try {
  config = loadConfig();

  const serverId = process.env.SERVER_ID || "rp-0";
  currentServer = findServerById(config, serverId);
} catch (err) {
  console.error("Config loading failed:", err.message);
  process.exit(1);
}

app.locals.config = config;
app.locals.currentServer = currentServer;

if (currentServer.type === "RP") {
  masterRegistry.initializeDefaultMasters(config);

  logger.info("Default DN masters initialized", {
    masters: masterRegistry.getAllMasters()
  });
}

app.use("/", commonRoutes.router);
app.use("/db", dbRoutes);

app.use((req, res) => {
  res.status(404).json(
    fail("eCOMMON404", "Route not found")
  );
});

app.use((err, req, res, next) => {
  logger.error("Unhandled server error", {
    message: err.message,
    stack: err.stack
  });

  res.status(500).json(
    fail("eCOMMON500", "Internal server error")
  );
});

app.listen(currentServer.port, currentServer.host, () => {
  logger.info("falconDB server started", {
    id: currentServer.id,
    type: currentServer.type,
    dnId: currentServer.dnId ?? null,
    host: currentServer.host,
    port: currentServer.port
  });

  console.log(
    `falconDB ${currentServer.type} server '${currentServer.id}' running at http://${currentServer.host}:${currentServer.port}`
  );
});