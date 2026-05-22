const state = {
  role: "follower",
  currentTerm: 0,
  votedFor: null,
  currentMaster: null
};

function getState() {
  return state;
}

function becomeFollower(term = state.currentTerm) {
  state.role = "follower";
  state.currentTerm = term;
  state.votedFor = null;
}

function becomeCandidate(serverId) {
  state.role = "candidate";
  state.currentTerm += 1;
  state.votedFor = serverId;
}

function becomeMaster(serverId) {
  state.role = "master";
  state.currentMaster = serverId;
}

function voteFor(serverId, term) {
  state.votedFor = serverId;
  state.currentTerm = term;
}

function setCurrentMaster(serverId) {
  state.currentMaster = serverId;
}

module.exports = {
  getState,
  becomeFollower,
  becomeCandidate,
  becomeMaster,
  voteFor,
  setCurrentMaster
};