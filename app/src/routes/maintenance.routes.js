const express = require("express");
const axios = require("axios");
const router = express.Router();

const fsCrud = require("../modules/fsCrud");
const masterRegistry = require("../modules/masterRegistry");
const { success, fail } = require("../modules/response");
const logger = require("../modules/logger");

function isDN(req) {
  return req.app.locals.currentServer.type === "DN";
}

function getCurrentServer(req) {
  return req.app.locals.currentServer;
}

function getServerId(req) {
  return req.app.locals.currentServer.id;
}

router.get("/keys", (req, res) => {
  if (!isDN(req)) {
    return res.status(403).json(
      fail("eMAINTENANCE403", "Maintenance routes are only available on DN servers")
    );
  }

  try {
    const serverId = getServerId(req);
    const pairs = fsCrud.listPairs(serverId);

    return res.json(
      success({
        serverId,
        count: pairs.length,
        keys: pairs.map(pair => pair.tuple.key)
      })
    );
  } catch (err) {
    logger.error("Maintenance keys failed", {
      serverId: getServerId(req),
      message: err.message
    });

    return res.status(400).json(
      fail("eMAINTENANCE_KEYS001", err.message)
    );
  }
});

router.get("/dump", (req, res) => {
  if (!isDN(req)) {
    return res.status(403).json(
      fail("eMAINTENANCE403", "Maintenance routes are only available on DN servers")
    );
  }

  try {
    const serverId = getServerId(req);
    const pairs = fsCrud.listPairs(serverId);

    return res.json(
      success({
        serverId,
        count: pairs.length,
        pairs
      })
    );
  } catch (err) {
    logger.error("Maintenance dump failed", {
      serverId: getServerId(req),
      message: err.message
    });

    return res.status(400).json(
      fail("eMAINTENANCE_DUMP001", err.message)
    );
  }
});

router.post("/sync-from-master", async (req, res) => {
  if (!isDN(req)) {
    return res.status(403).json(
      fail("eMAINTENANCE403", "Maintenance routes are only available on DN servers")
    );
  }

  try {
    const currentServer = getCurrentServer(req);
    const config = req.app.locals.config;

    /**
     * Bu route DN server üzerinde çalışıyor.
     * Master bilgisini RP'den öğreniyoruz.
     */
    const mastersUrl = `http://${config.rp.host}:${config.rp.port}/masters`;
    const mastersResponse = await axios.get(mastersUrl, { timeout: 5000 });

    const master = mastersResponse.data?.data?.masters?.[String(currentServer.dnId)];

    if (!master) {
      return res.status(404).json(
        fail("eMAINTENANCE_MASTER_NOT_FOUND", `No master found for DN-${currentServer.dnId}`)
      );
    }

    if (master.id === currentServer.id) {
      return res.json(
        success({
          message: "Current server is already master. Sync is not needed.",
          serverId: currentServer.id,
          master
        })
      );
    }

    const dumpUrl = `http://${master.host}:${master.port}/maintenance/dump`;
    const dumpResponse = await axios.get(dumpUrl, { timeout: 5000 });

    const pairs = dumpResponse.data?.data?.pairs || [];

    const synced = [];

    for (const pair of pairs) {
      const key = pair.tuple.key;
      const value = pair.tuple.value;

      const result = fsCrud.overwritePair(key, value, currentServer.id);

      synced.push({
        key,
        DB_key: result.DB_key
      });
    }

    logger.info("Maintenance sync completed", {
      serverId: currentServer.id,
      master: master.id,
      syncedCount: synced.length
    });

    return res.json(
      success({
        message: "Sync completed from master",
        serverId: currentServer.id,
        master,
        syncedCount: synced.length,
        synced
      })
    );
  } catch (err) {
    logger.error("Maintenance sync failed", {
      serverId: getServerId(req),
      message: err.message
    });

    return res.status(400).json(
      fail("eMAINTENANCE_SYNC001", err.message)
    );
  }
});

module.exports = router;