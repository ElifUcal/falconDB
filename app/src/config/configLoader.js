const fs = require("fs");
const path = require("path");

function loadConfig() {
  const configPath = path.join(__dirname, "../../etc/configure.json");

  if (!fs.existsSync(configPath)) {
    throw new Error("configure.json file not found");
  }

  const rawConfig = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(rawConfig);
}

function findServerById(config, serverId) {
  if (!serverId) {
    throw new Error("SERVER_ID environment variable is required");
  }

  if (config.rp && config.rp.id === serverId) {
    return config.rp;
  }

  for (const dataNode of config.dataNodes || []) {
    const foundServer = dataNode.servers.find(
      server => server.id === serverId
    );

    if (foundServer) {
      return foundServer;
    }
  }

  throw new Error(`Server with id '${serverId}' not found in configure.json`);
}

function getDataNodeById(config, dnId) {
  return (config.dataNodes || []).find(
    dataNode => Number(dataNode.id) === Number(dnId)
  );
}

module.exports = {
  loadConfig,
  findServerById,
  getDataNodeById
};