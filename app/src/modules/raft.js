const axios = require("axios");
const raftState = require("./raftState");
const logger = require("./logger");

function getServersInSameDN(config, currentServer) {
  const dataNode = (config.dataNodes || []).find(
    dn => Number(dn.id) === Number(currentServer.dnId)
  );

  if (!dataNode) {
    throw new Error(`Data node ${currentServer.dnId} not found`);
  }

  return dataNode.servers;
}

function getOtherServersInSameDN(config, currentServer) {
  return getServersInSameDN(config, currentServer).filter(
    server => server.id !== currentServer.id
  );
}

async function requestVote(server, payload) {
  const url = `http://${server.host}:${server.port}/election/request-vote`;

  return axios.post(url, payload, {
    timeout: 5000,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function notifyRPAboutMaster(config, currentServer) {
  const url = `http://${config.rp.host}:${config.rp.port}/set_master`;

  const response = await axios.get(url, {
    params: {
      dnId: currentServer.dnId,
      serverId: currentServer.id
    },
    timeout: 5000
  });

  return response.data;
}

async function startElection(req) {
  const config = req.app.locals.config;
  const currentServer = req.app.locals.currentServer;

  if (currentServer.type !== "DN") {
    throw new Error("Election can only be started by DN server");
  }

  const allServers = getServersInSameDN(config, currentServer);
  const otherServers = getOtherServersInSameDN(config, currentServer);

  raftState.becomeCandidate(currentServer.id);

  const localState = raftState.getState();

  logger.raft("Election started", {
    candidate: currentServer.id,
    dnId: currentServer.dnId,
    term: localState.currentTerm,
    role: localState.role
  });

  let votesGranted = 1;

  const votePayload = {
    term: localState.currentTerm,
    candidateId: currentServer.id,
    dnId: currentServer.dnId
  };

  const voteResults = [];

  for (const server of otherServers) {
    try {
      const response = await requestVote(server, votePayload);

      voteResults.push({
        serverId: server.id,
        response: response.data
      });

      if (response.data?.data?.voteGranted === true) {
        votesGranted++;
      }

      logger.raft("Vote response received", {
        candidate: currentServer.id,
        from: server.id,
        response: response.data
      });
    } catch (err) {
      voteResults.push({
        serverId: server.id,
        error: err.message
      });

      logger.raft("Vote request failed", {
        candidate: currentServer.id,
        target: server.id,
        message: err.message
      });
    }
  }

  const majority = Math.floor(allServers.length / 2) + 1;

  if (votesGranted >= majority) {
    raftState.becomeMaster(currentServer.id);

    logger.raft("Candidate became master", {
      master: currentServer.id,
      dnId: currentServer.dnId,
      term: raftState.getState().currentTerm,
      votesGranted,
      majority
    });

    const rpResponse = await notifyRPAboutMaster(config, currentServer);

    logger.raft("Master identity sent to RP", {
      master: currentServer.id,
      dnId: currentServer.dnId,
      rpResponse
    });

    return {
      elected: true,
      master: currentServer.id,
      dnId: currentServer.dnId,
      term: raftState.getState().currentTerm,
      votesGranted,
      majority,
      voteResults,
      rpResponse
    };
  }

  raftState.becomeFollower(localState.currentTerm);

  logger.raft("Election failed, candidate returned to follower", {
    candidate: currentServer.id,
    dnId: currentServer.dnId,
    term: localState.currentTerm,
    votesGranted,
    majority
  });

  return {
    elected: false,
    candidate: currentServer.id,
    dnId: currentServer.dnId,
    term: localState.currentTerm,
    votesGranted,
    majority,
    voteResults
  };
}

function handleVoteRequest(req) {
  const currentServer = req.app.locals.currentServer;
  const { term, candidateId, dnId } = req.body;

  if (currentServer.type !== "DN") {
    throw new Error("Vote request can only be handled by DN server");
  }

  if (Number(currentServer.dnId) !== Number(dnId)) {
    return {
      voteGranted: false,
      reason: "Candidate belongs to another DN",
      serverId: currentServer.id,
      state: raftState.getState()
    };
  }

  const state = raftState.getState();

  logger.raft("Vote request received", {
    serverId: currentServer.id,
    candidateId,
    candidateTerm: term,
    currentTerm: state.currentTerm,
    votedFor: state.votedFor
  });

  if (term < state.currentTerm) {
    return {
      voteGranted: false,
      reason: "Candidate term is older than current term",
      serverId: currentServer.id,
      state
    };
  }

  if (term > state.currentTerm) {
    raftState.becomeFollower(term);
  }

  const updatedState = raftState.getState();

  if (updatedState.votedFor && updatedState.votedFor !== candidateId) {
    return {
      voteGranted: false,
      reason: "Already voted for another candidate",
      serverId: currentServer.id,
      state: updatedState
    };
  }

  raftState.voteFor(candidateId, term);

  logger.raft("Vote granted", {
    serverId: currentServer.id,
    candidateId,
    term
  });

  return {
    voteGranted: true,
    serverId: currentServer.id,
    term,
    state: raftState.getState()
  };
}

module.exports = {
  startElection,
  handleVoteRequest
};