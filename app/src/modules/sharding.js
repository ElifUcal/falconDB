const md5 = require("md5");

function getDNIdByKey(key, dataNodes) {
  if (key === undefined || key === null) {
    throw new Error("Key is required for sharding");
  }

  if (!dataNodes || dataNodes.length === 0) {
    throw new Error("No data nodes configured");
  }

  const hash = md5(String(key));
  const numericPart = parseInt(hash.substring(0, 8), 16);

  const index = numericPart % dataNodes.length;

  return dataNodes[index].id;
}

module.exports = {
  getDNIdByKey
};