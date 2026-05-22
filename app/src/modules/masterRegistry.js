const masters = {};

function setMaster(dnId, server) {
  masters[Number(dnId)] = {
    id: server.id,
    host: server.host,
    port: server.port
  };
}

function getMaster(dnId) {
  return masters[Number(dnId)] || null;
}

function getAllMasters() {
  return masters;
}

function initializeDefaultMasters(config) {
  for (const dataNode of config.dataNodes || []) {
    const firstServer = dataNode.servers[0];

    if (firstServer) {
      setMaster(dataNode.id, firstServer);
    }
  }
}

module.exports = {
  setMaster,
  getMaster,
  getAllMasters,
  initializeDefaultMasters
};