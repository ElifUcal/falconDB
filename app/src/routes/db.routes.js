const express = require("express");
const router = express.Router();

const fsCrud = require("../modules/fsCrud");
const { success, fail } = require("../modules/response");
const logger = require("../modules/logger");
const commonRoutes = require("./common.routes");
const { forwardDbRequest } = require("../modules/rpProxy");

function isRP(req) {
  return req.app.locals.currentServer.type === "RP";
}

function isDN(req) {
  return req.app.locals.currentServer.type === "DN";
}

async function handleRpForwarding(req, res) {
  try {
    const result = await forwardDbRequest(req, req.app.locals.config);

    logger.info("RP forwarded DB request to DN master", {
      originalUrl: req.originalUrl,
      dnId: result.dnId,
      master: result.master
    });

    res.json(result.responseData);
  } catch (err) {
    const dnStatus = err.response?.status;
    const dnData = err.response?.data;

    logger.error("RP forwarding failed", {
      message: err.message,
      originalUrl: req.originalUrl,
      dnStatus,
      dnData
    });

    if (dnData) {
      return res.status(dnStatus || 502).json(dnData);
    }

    res.status(502).json(
      fail("eRPFORWARD001", err.message)
    );
  }
}

router.post("/c", async (req, res) => {
  if (isRP(req)) {
    return handleRpForwarding(req, res);
  }

  if (!isDN(req)) {
    return res.status(403).json(
      fail("eDBCREATE403", "Only DN server can execute create operation")
    );
  }

  try {
    const { key, value } = req.body;

    const result = fsCrud.createPair(key, value);

    commonRoutes.stats.create++;

    logger.info("DN create operation completed", {
      serverId: req.app.locals.currentServer.id,
      key,
      DB_key: result.DB_key
    });

    res.json(success({
      ...result,
      DN_id: req.app.locals.currentServer.dnId
    }));
  } catch (err) {
    logger.error("DN create operation failed", {
      serverId: req.app.locals.currentServer.id,
      message: err.message
    });

    res.status(400).json(
      fail("eDBCREATE001", err.message)
    );
  }
});

router.get("/r", async (req, res) => {
  if (isRP(req)) {
    return handleRpForwarding(req, res);
  }

  if (!isDN(req)) {
    return res.status(403).json(
      fail("eDBREAD403", "Only DN server can execute read operation")
    );
  }

  try {
    const { key } = req.query;

    const result = fsCrud.readPair(key);

    commonRoutes.stats.read++;

    logger.info("DN read operation completed", {
      serverId: req.app.locals.currentServer.id,
      key,
      DB_key: result.DB_key
    });

    res.json(success({
      ...result,
      DN_id: req.app.locals.currentServer.dnId
    }));
  } catch (err) {
    logger.error("DN read operation failed", {
      serverId: req.app.locals.currentServer.id,
      message: err.message
    });

    res.status(400).json(
      fail("eDBREAD001", err.message)
    );
  }
});

router.post("/u", async (req, res) => {
  if (isRP(req)) {
    return handleRpForwarding(req, res);
  }

  if (!isDN(req)) {
    return res.status(403).json(
      fail("eDBUPDATE403", "Only DN server can execute update operation")
    );
  }

  try {
    const { key, value } = req.body;

    const result = fsCrud.updatePair(key, value);

    commonRoutes.stats.update++;

    logger.info("DN update operation completed", {
      serverId: req.app.locals.currentServer.id,
      key,
      DB_key: result.DB_key
    });

    res.json(success({
      ...result,
      DN_id: req.app.locals.currentServer.dnId
    }));
  } catch (err) {
    logger.error("DN update operation failed", {
      serverId: req.app.locals.currentServer.id,
      message: err.message
    });

    res.status(400).json(
      fail("eDBUPDATE001", err.message)
    );
  }
});

router.get("/d", async (req, res) => {
  if (isRP(req)) {
    return handleRpForwarding(req, res);
  }

  if (!isDN(req)) {
    return res.status(403).json(
      fail("eDBDELETE403", "Only DN server can execute delete operation")
    );
  }

  try {
    const { key } = req.query;

    const result = fsCrud.deletePair(key);

    commonRoutes.stats.delete++;

    logger.info("DN delete operation completed", {
      serverId: req.app.locals.currentServer.id,
      key,
      DB_key: result.DB_key
    });

    res.json(success({
      ...result,
      DN_id: req.app.locals.currentServer.dnId
    }));
  } catch (err) {
    logger.error("DN delete operation failed", {
      serverId: req.app.locals.currentServer.id,
      message: err.message
    });

    res.status(400).json(
      fail("eDBDELETE001", err.message)
    );
  }
});

module.exports = router;