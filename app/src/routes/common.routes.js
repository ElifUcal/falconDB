const express = require("express");
const router = express.Router();

const { success } = require("../modules/response");

//Şimdi bütün server’larda ortak olacak route’ları yazmaya başlıyoruz.

const startTime = new Date();

const stats = {
  create: 0,
  read: 0,
  update: 0,
  delete: 0
};

function getLivingTime() {
  const now = new Date();
  const diffMs = now - startTime;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  return {
    seconds,
    minutes,
    hours
  };
}

router.get("/status", (req, res) => {
  const currentServer = req.app.locals.currentServer;

  res.json(
    success({
      status: "running",
      server: {
        id: currentServer.id,
        type: currentServer.type,
        dnId: currentServer.dnId ?? null,
        host: currentServer.host,
        port: currentServer.port
      },
      startTime,
      livingTime: getLivingTime()
    })
  );
});

router.get("/stat", (req, res) => {
  res.json(success(stats));
});

router.get("/admin", (req, res) => {
  res.json(
    success({
      message: "Admin root route"
    })
  );
});

router.get("/db", (req, res) => {
  res.json(
    success({
      message: "DB root route"
    })
  );
});

router.get("/stop", (req, res) => {
  res.json(
    success({
      message: "Stop route will be implemented later"
    })
  );
});

module.exports = {
  router,
  stats
};