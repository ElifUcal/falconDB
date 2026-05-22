const express = require("express");
const router = express.Router();

const raft = require("../modules/raft");
const raftState = require("../modules/raftState");
const { success, fail } = require("../modules/response");
const logger = require("../modules/logger");

function isDN(req) {
  return req.app.locals.currentServer.type === "DN";
}

router.get("/state", (req, res) => {
  if (!isDN(req)) {
    return res.status(403).json(
      fail("eELECTION403", "Election routes are only available on DN servers")
    );
  }

  return res.json(
    success({
      server: req.app.locals.currentServer,
      raft: raftState.getState()
    })
  );
});

router.post("/start", async (req, res) => {
  if (!isDN(req)) {
    return res.status(403).json(
      fail("eELECTION403", "Election routes are only available on DN servers")
    );
  }

  try {
    const result = await raft.startElection(req);

    return res.json(
      success(result)
    );
  } catch (err) {
    logger.error("Election start failed", {
      serverId: req.app.locals.currentServer.id,
      message: err.message
    });

    return res.status(400).json(
      fail("eELECTION_START001", err.message)
    );
  }
});

router.post("/request-vote", (req, res) => {
  if (!isDN(req)) {
    return res.status(403).json(
      fail("eELECTION403", "Election routes are only available on DN servers")
    );
  }

  try {
    const result = raft.handleVoteRequest(req);

    return res.json(
      success(result)
    );
  } catch (err) {
    logger.error("Vote request failed", {
      serverId: req.app.locals.currentServer.id,
      message: err.message
    });

    return res.status(400).json(
      fail("eELECTION_VOTE001", err.message)
    );
  }
});

module.exports = router;