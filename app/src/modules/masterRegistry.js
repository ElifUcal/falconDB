const masters = {};

function setMaster(dnId, server) {
  masters[Number(dnId)] = {
    id: server.id,
    host: server.host,
    port: Number(server.port)
  };
}

function getMaster(dnId) {
  return masters[Number(dnId)] || null;
}

function getAllMasters() {
  return masters;
}

// configure.json içinde DN-0 altında dn0-s2 var mı diye kontrol eder
function findServerInDN(config, dnId, serverId) {
  const dataNode = (config.dataNodes || []).find(
    dn => Number(dn.id) === Number(dnId)
  );

  if (!dataNode) {
    return null;
  }

  return dataNode.servers.find(
    server => server.id === serverId
  ) || null;
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
  findServerInDN,
  initializeDefaultMasters
};