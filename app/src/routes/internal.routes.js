const express = require("express");
const router = express.Router();

const fsCrud = require("../modules/fsCrud");
const transactionStore = require("../modules/transactionStore");
const { success, fail } = require("../modules/response");
const logger = require("../modules/logger");

function isDN(req) {
  return req.app.locals.currentServer.type === "DN";
}

function getServerId(req) {
  return req.app.locals.currentServer.id;
}

router.post("/prepare", (req, res) => {
  if (!isDN(req)) {
    return res.status(403).json(
      fail("eINTERNAL403", "Internal transaction routes are only available on DN servers")
    );
  }

  try {
    const { transactionId, operation, key, value } = req.body;

    if (!transactionId || !operation || key === undefined || key === null) {
      return res.status(400).json(
        fail("ePREPARE001", "transactionId, operation and key are required")
      );
    }

    if (!["create", "update", "delete"].includes(operation)) {
      return res.status(400).json(
        fail("ePREPARE002", "Invalid operation")
      );
    }

    const serverId = getServerId(req);
    const exists = fsCrud.pairExists(key, serverId);

    if (operation === "create" && exists) {
      return res.status(409).json(
        fail("ePREPARE_CREATE_CONFLICT", "Key already exists on participant")
      );
    }

    if ((operation === "update" || operation === "delete") && !exists) {
      return res.status(404).json(
        fail("ePREPARE_KEY_NOT_FOUND", "Key not found on participant")
      );
    }

    transactionStore.saveTransaction(transactionId, {
      operation,
      key,
      value
    });

    logger.info("Transaction prepared", {
      serverId: getServerId(req),
      transactionId,
      operation,
      key
    });

    return res.json(
      success({
        transactionId,
        status: "prepared",
        serverId: getServerId(req)
      })
    );
  } catch (err) {
    logger.error("Prepare failed", {
      serverId: getServerId(req),
      message: err.message
    });

    return res.status(400).json(
      fail("ePREPARE003", err.message)
    );
  }
});

router.post("/commit", (req, res) => {
  if (!isDN(req)) {
    return res.status(403).json(
      fail("eINTERNAL403", "Internal transaction routes are only available on DN servers")
    );
  }

  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json(
        fail("eCOMMIT001", "transactionId is required")
      );
    }

    const transaction = transactionStore.getTransaction(transactionId);

    if (!transaction) {
      return res.status(404).json(
        fail("eCOMMIT002", "Transaction not found")
      );
    }

    const serverId = getServerId(req);
    let result;

    if (transaction.operation === "create") {
      result = fsCrud.createPair(transaction.key, transaction.value, serverId);
    } else if (transaction.operation === "update") {
      result = fsCrud.updatePair(transaction.key, transaction.value, serverId);
    } else if (transaction.operation === "delete") {
      result = fsCrud.deletePair(transaction.key, serverId);
    } else {
      return res.status(400).json(
        fail("eCOMMIT004", "Invalid transaction operation")
      );
    }

    transactionStore.markCommitted(transactionId);
    transactionStore.removeTransaction(transactionId);

    logger.info("Transaction committed", {
      serverId,
      transactionId,
      operation: transaction.operation,
      key: transaction.key
    });

    return res.json(
      success({
        transactionId,
        status: "committed",
        serverId,
        result
      })
    );
  } catch (err) {
    logger.error("Commit failed", {
      serverId: getServerId(req),
      message: err.message
    });

    return res.status(400).json(
      fail("eCOMMIT003", err.message)
    );
  }
});

router.post("/abort", (req, res) => {
  if (!isDN(req)) {
    return res.status(403).json(
      fail("eINTERNAL403", "Internal transaction routes are only available on DN servers")
    );
  }

  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json(
        fail("eABORT001", "transactionId is required")
      );
    }

    transactionStore.markAborted(transactionId);
    transactionStore.removeTransaction(transactionId);

    logger.info("Transaction aborted", {
      serverId: getServerId(req),
      transactionId
    });

    return res.json(
      success({
        transactionId,
        status: "aborted",
        serverId: getServerId(req)
      })
    );
  } catch (err) {
    logger.error("Abort failed", {
      serverId: getServerId(req),
      message: err.message
    });

    return res.status(400).json(
      fail("eABORT002", err.message)
    );
  }
});

module.exports = router;