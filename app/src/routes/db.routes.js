const express = require("express");
const router = express.Router();

const fsCrud = require("../modules/fsCrud");
const { executeTwoPhaseCommit } = require("../modules/twoPhaseCommit");
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

function getCurrentServer(req) {
  return req.app.locals.currentServer;
}

function getCurrentServerId(req) {
  return req.app.locals.currentServer.id;
}

async function handleRpForwarding(req, res) {
  try {
    const result = await forwardDbRequest(req, req.app.locals.config);

    logger.info("RP forwarded DB request to DN master", {
      originalUrl: req.originalUrl,
      dnId: result.dnId,
      master: result.master
    });

    return res.json(result.responseData);
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

    return res.status(502).json(
      fail("eRPFORWARD001", err.message)
    );
  }
}

/**
 * CREATE
 * RP ise isteği DN master'a forward eder.
 * DN ise 2 Phase Commit başlatır.
 */
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
    const currentServer = getCurrentServer(req);
    const serverId = getCurrentServerId(req);

    const twoPcResult = await executeTwoPhaseCommit({
      req,
      operation: "create",
      key,
      value
    });

    const result = twoPcResult.result;

    commonRoutes.stats.create++;

    logger.info("DN create operation completed with 2PC", {
      serverId,
      key,
      DB_key: result.DB_key,
      transactionId: twoPcResult.transactionId
    });

    return res.json(
      success({
        ...result,
        DN_id: currentServer.dnId,
        transaction: {
          id: twoPcResult.transactionId,
          coordinator: twoPcResult.coordinator,
          participants: twoPcResult.participants
        }
      })
    );
  } catch (err) {
    logger.error("DN create operation failed", {
      serverId: getCurrentServerId(req),
      message: err.message
    });

    return res.status(400).json(
      fail("eDBCREATE001", err.message)
    );
  }
});

/**
 * READ
 * RP ise isteği DN master'a forward eder.
 * DN ise sadece kendi local DB klasöründen okur.
 * READ için 2PC yok.
 */
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
    const currentServer = getCurrentServer(req);
    const serverId = getCurrentServerId(req);

    const result = fsCrud.readPair(key, serverId);

    commonRoutes.stats.read++;

    logger.info("DN read operation completed", {
      serverId,
      key,
      DB_key: result.DB_key
    });

    return res.json(
      success({
        ...result,
        DN_id: currentServer.dnId
      })
    );
  } catch (err) {
    logger.error("DN read operation failed", {
      serverId: getCurrentServerId(req),
      message: err.message
    });

    return res.status(400).json(
      fail("eDBREAD001", err.message)
    );
  }
});

/**
 * UPDATE
 * RP ise isteği DN master'a forward eder.
 * DN ise 2 Phase Commit başlatır.
 */
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
    const currentServer = getCurrentServer(req);
    const serverId = getCurrentServerId(req);

    const twoPcResult = await executeTwoPhaseCommit({
      req,
      operation: "update",
      key,
      value
    });

    const result = twoPcResult.result;

    commonRoutes.stats.update++;

    logger.info("DN update operation completed with 2PC", {
      serverId,
      key,
      DB_key: result.DB_key,
      transactionId: twoPcResult.transactionId
    });

    return res.json(
      success({
        ...result,
        DN_id: currentServer.dnId,
        transaction: {
          id: twoPcResult.transactionId,
          coordinator: twoPcResult.coordinator,
          participants: twoPcResult.participants
        }
      })
    );
  } catch (err) {
    logger.error("DN update operation failed", {
      serverId: getCurrentServerId(req),
      message: err.message
    });

    return res.status(400).json(
      fail("eDBUPDATE001", err.message)
    );
  }
});

/**
 * DELETE
 * RP ise isteği DN master'a forward eder.
 * DN ise 2 Phase Commit başlatır.
 */
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
    const currentServer = getCurrentServer(req);
    const serverId = getCurrentServerId(req);

    const twoPcResult = await executeTwoPhaseCommit({
      req,
      operation: "delete",
      key
    });

    const result = twoPcResult.result;

    commonRoutes.stats.delete++;

    logger.info("DN delete operation completed with 2PC", {
      serverId,
      key,
      DB_key: result.DB_key,
      transactionId: twoPcResult.transactionId
    });

    return res.json(
      success({
        ...result,
        DN_id: currentServer.dnId,
        transaction: {
          id: twoPcResult.transactionId,
          coordinator: twoPcResult.coordinator,
          participants: twoPcResult.participants
        }
      })
    );
  } catch (err) {
    logger.error("DN delete operation failed", {
      serverId: getCurrentServerId(req),
      message: err.message
    });

    return res.status(400).json(
      fail("eDBDELETE001", err.message)
    );
  }
});

module.exports = router;