const express = require("express");
const router = express.Router();

const fsCrud = require("../modules/fsCrud");
const { success, fail } = require("../modules/response");
const logger = require("../modules/logger");
const commonRoutes = require("./common.routes");

router.post("/c", (req, res) => {
  try {
    const { key, value } = req.body;

    const result = fsCrud.createPair(key, value);

    commonRoutes.stats.create++;

    logger.info("DB create operation completed", {
      key,
      DB_key: result.DB_key
    });

    res.json(success(result));
  } catch (err) {
    logger.error("DB create operation failed", {
      message: err.message
    });

    res.status(400).json(
      fail("eDBCREATE001", err.message)
    );
  }
});

router.get("/r", (req, res) => {
  try {
    const { key } = req.query;

    const result = fsCrud.readPair(key);

    commonRoutes.stats.read++;

    logger.info("DB read operation completed", {
      key,
      DB_key: result.DB_key
    });

    res.json(success(result));
  } catch (err) {
    logger.error("DB read operation failed", {
      message: err.message
    });

    res.status(400).json(
      fail("eDBREAD001", err.message)
    );
  }
});

router.post("/u", (req, res) => {
  try {
    const { key, value } = req.body;

    const result = fsCrud.updatePair(key, value);

    commonRoutes.stats.update++;

    logger.info("DB update operation completed", {
      key,
      DB_key: result.DB_key
    });

    res.json(success(result));
  } catch (err) {
    logger.error("DB update operation failed", {
      message: err.message
    });

    res.status(400).json(
      fail("eDBUPDATE001", err.message)
    );
  }
});

router.get("/d", (req, res) => {
  try {
    const { key } = req.query;

    const result = fsCrud.deletePair(key);

    commonRoutes.stats.delete++;

    logger.info("DB delete operation completed", {
      key,
      DB_key: result.DB_key
    });

    res.json(success(result));
  } catch (err) {
    logger.error("DB delete operation failed", {
      message: err.message
    });

    res.status(400).json(
      fail("eDBDELETE001", err.message)
    );
  }
});

module.exports = router;