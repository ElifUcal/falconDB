const axios = require("axios");
const { getDNIdByKey } = require("./sharding");
const masterRegistry = require("./masterRegistry");

async function forwardDbRequest(req, config) {
  const method = req.method.toLowerCase();

  let key;

  if (method === "get") {
    key = req.query.key;
  } else {
    key = req.body.key;
  }

  const dnId = getDNIdByKey(key, config.dataNodes);
  const master = masterRegistry.getMaster(dnId);

  if (!master) {
    throw new Error(`No master found for DN-${dnId}`);
  }

  // ÖNEMLİ:
  // req.originalUrl query string içerir.
  // Biz burada query string'i kaldırıyoruz.
  // Query'i ayrıca axios params ile göndereceğiz.
  const targetPath = req.originalUrl.split("?")[0];

  const targetUrl = `http://${master.host}:${master.port}${targetPath}`;

  const axiosConfig = {
    method,
    url: targetUrl,
    params: req.query,
    headers: {
      "Content-Type": "application/json",
      "x-falcondb-from-rp": "true"
    },
    timeout: 5000
  };

  if (method !== "get") {
    axiosConfig.data = req.body;
  }

  const response = await axios(axiosConfig);

  return {
    dnId,
    master,
    responseData: response.data
  };
}

module.exports = {
  forwardDbRequest
};