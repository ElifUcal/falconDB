const express = require("express");
const router = express.Router();

const masterRegistry = require("../modules/masterRegistry");
const { success, fail } = require("../modules/response");
const logger = require("../modules/logger");

function onlyRP(req, res) {
  const currentServer = req.app.locals.currentServer;

  if (currentServer.type !== "RP") {
    res.status(403).json(
      fail("eRP403", "This route is only available on RP server")
    );

    return false;
  }

  return true;
}

router.get("/masters", (req, res) => {
  if (!onlyRP(req, res)) return;

  res.json(
    success({
      masters: masterRegistry.getAllMasters()
    })
  );
});

router.get("/set_master", (req, res) => {
  if (!onlyRP(req, res)) return;

  const { dnId, serverId } = req.query;
  const config = req.app.locals.config;

  if (dnId === undefined || !serverId) {
    return res.status(400).json(
      fail("eRPSETMASTER001", "dnId and serverId are required")
    );
  }

  const server = masterRegistry.findServerInDN(config, dnId, serverId);

  if (!server) {
    return res.status(400).json(
      fail(
        "eRPSETMASTER002",
        `Server '${serverId}' was not found in DN-${dnId}`
      )
    );
  }

  masterRegistry.setMaster(dnId, server);

  logger.info("RP master updated", {
    dnId,
    master: server
  });

  res.json(
    success({
      message: "Master updated successfully",
      DN_id: Number(dnId),
      master: {
        id: server.id,
        host: server.host,
        port: server.port
      }
    })
  );
});

module.exports = router;