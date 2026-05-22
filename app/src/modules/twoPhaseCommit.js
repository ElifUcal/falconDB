const axios = require("axios");
const crypto = require("crypto");
const fsCrud = require("./fsCrud");
const logger = require("./logger");

function createTransactionId() {
  return crypto.randomUUID();
}

function getOtherServersInSameDN(config, currentServer) {
  const dataNode = (config.dataNodes || []).find(
    dn => Number(dn.id) === Number(currentServer.dnId)
  );

  if (!dataNode) {
    throw new Error(`Data node ${currentServer.dnId} not found`);
  }

  return dataNode.servers.filter(
    server => server.id !== currentServer.id
  );
}

async function sendPrepare(server, payload) {
  const url = `http://${server.host}:${server.port}/internal/prepare`;

  return axios.post(url, payload, {
    timeout: 5000,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function sendCommit(server, transactionId) {
  const url = `http://${server.host}:${server.port}/internal/commit`;

  return axios.post(url, { transactionId }, {
    timeout: 5000,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function sendAbort(server, transactionId) {
  const url = `http://${server.host}:${server.port}/internal/abort`;

  return axios.post(url, { transactionId }, {
    timeout: 5000,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function executeTwoPhaseCommit({ req, operation, key, value }) {
  const config = req.app.locals.config;
  const currentServer = req.app.locals.currentServer;
  const serverId = currentServer.id;

  const transactionId = createTransactionId();
  const otherServers = getOtherServersInSameDN(config, currentServer);

  const payload = {
    transactionId,
    operation,
    key,
    value
  };

  logger.info("2PC started", {
    transactionId,
    coordinator: serverId,
    operation,
    key,
    participants: otherServers.map(s => s.id)
  });

  try {
    // Phase 1: Prepare
    for (const server of otherServers) {
      await sendPrepare(server, payload);
    }

    // Phase 2: Commit participants
    for (const server of otherServers) {
      await sendCommit(server, transactionId);
    }

    // Phase 2: Commit coordinator/master locally
    let coordinatorResult;

    if (operation === "create") {
      coordinatorResult = fsCrud.createPair(key, value, serverId);
    } else if (operation === "update") {
      coordinatorResult = fsCrud.updatePair(key, value, serverId);
    } else if (operation === "delete") {
      coordinatorResult = fsCrud.deletePair(key, serverId);
    } else {
      throw new Error("Invalid 2PC operation");
    }

    logger.info("2PC completed", {
      transactionId,
      coordinator: serverId,
      operation,
      key
    });

    return {
      transactionId,
      coordinator: serverId,
      participants: otherServers.map(s => s.id),
      result: coordinatorResult
    };
  } catch (err) {
    logger.error("2PC failed, sending abort", {
      transactionId,
      coordinator: serverId,
      message: err.message
    });

    for (const server of otherServers) {
      try {
        await sendAbort(server, transactionId);
      } catch (abortErr) {
        logger.error("Abort request failed", {
          transactionId,
          targetServer: server.id,
          message: abortErr.message
        });
      }
    }

    throw err;
  }
}

module.exports = {
  executeTwoPhaseCommit
};