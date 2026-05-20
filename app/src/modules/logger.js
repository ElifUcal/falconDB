const winston = require("winston");
const path = require("path");

//Winston ile log sistemi
const logsDir = path.join(__dirname, "../../logs");

const systemLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, "system.log")
    }),
    new winston.transports.Console()
  ]
});

const raftLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, "raft.log")
    })
  ]
});

function info(message, meta = {}) {
  systemLogger.info(message, meta);
}

function error(message, meta = {}) {
  systemLogger.error(message, meta);
}

function raft(message, meta = {}) {
  raftLogger.info(message, meta);
}

module.exports = {
  info,
  error,
  raft
};