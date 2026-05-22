const fs = require("fs");
const path = require("path");
const md5 = require("md5");

function getDbDataDir(serverId = "default") {
  const dbDataDir = path.join(__dirname, "../../DBdata", serverId);

  if (!fs.existsSync(dbDataDir)) {
    fs.mkdirSync(dbDataDir, { recursive: true });
  }

  return dbDataDir;
}

function getFilePathByKey(key, serverId) {
  const hashedKey = md5(String(key));
  const dbDataDir = getDbDataDir(serverId);

  return {
    hashedKey,
    filePath: path.join(dbDataDir, `${hashedKey}.json`)
  };
}

function pairExists(key, serverId) {
  if (key === undefined || key === null) {
    return false;
  }

  const { filePath } = getFilePathByKey(key, serverId);

  return fs.existsSync(filePath);
}

function validateKeyValue(key, value) {
  const validTypes = ["string", "number", "object"];

  if (key === undefined || key === null) {
    throw new Error("Key is required");
  }

  if (value === undefined || value === null) {
    throw new Error("Value is required");
  }

  if (!validTypes.includes(typeof key)) {
    throw new Error("Key must be a string, number or flat object");
  }

  if (!validTypes.includes(typeof value)) {
    throw new Error("Value must be a string, number or flat object");
  }

  if (Array.isArray(key) || Array.isArray(value)) {
    throw new Error("Array is not allowed");
  }
}

function createPair(key, value, serverId) {
  validateKeyValue(key, value);

  const { hashedKey, filePath } = getFilePathByKey(key, serverId);

  if (fs.existsSync(filePath)) {
    throw new Error("Key already exists");
  }

  const tuple = {
    key,
    value
  };

  fs.writeFileSync(filePath, JSON.stringify(tuple, null, 2), "utf-8");

  return {
    DB_key: hashedKey,
    tuple
  };
}

function readPair(key, serverId) {
  if (key === undefined || key === null) {
    throw new Error("Key is required");
  }

  const { hashedKey, filePath } = getFilePathByKey(key, serverId);

  if (!fs.existsSync(filePath)) {
    throw new Error("Key not found");
  }

  const rawData = fs.readFileSync(filePath, "utf-8");
  const tuple = JSON.parse(rawData);

  return {
    DB_key: hashedKey,
    tuple
  };
}

function updatePair(key, value, serverId) {
  validateKeyValue(key, value);

  const { hashedKey, filePath } = getFilePathByKey(key, serverId);

  if (!fs.existsSync(filePath)) {
    throw new Error("Key not found");
  }

  const rawData = fs.readFileSync(filePath, "utf-8");
  const existingTuple = JSON.parse(rawData);

  let newValue;

  if (
    typeof existingTuple.value === "object" &&
    !Array.isArray(existingTuple.value) &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    newValue = {
      ...existingTuple.value
    };

    for (const memberName of Object.keys(value)) {
      if (value[memberName] === "--delete--") {
        delete newValue[memberName];
      } else {
        newValue[memberName] = value[memberName];
      }
    }
  } else {
    newValue = value;
  }

  const updatedTuple = {
    key,
    value: newValue
  };

  fs.writeFileSync(filePath, JSON.stringify(updatedTuple, null, 2), "utf-8");

  return {
    DB_key: hashedKey,
    tuple: updatedTuple
  };
}

function deletePair(key, serverId) {
  if (key === undefined || key === null) {
    throw new Error("Key is required");
  }

  const { hashedKey, filePath } = getFilePathByKey(key, serverId);

  if (!fs.existsSync(filePath)) {
    throw new Error("Key not found");
  }

  fs.unlinkSync(filePath);

  return {
    DB_key: hashedKey,
    deleted: true
  };
}

function listPairs(serverId) {
  const dbDataDir = getDbDataDir(serverId);

  const files = fs.readdirSync(dbDataDir).filter(
    file => file.endsWith(".json")
  );

  return files.map(file => {
    const filePath = path.join(dbDataDir, file);
    const rawData = fs.readFileSync(filePath, "utf-8");
    const tuple = JSON.parse(rawData);

    return {
      DB_key: file.replace(".json", ""),
      tuple
    };
  });
}

function overwritePair(key, value, serverId) {
  validateKeyValue(key, value);

  const { hashedKey, filePath } = getFilePathByKey(key, serverId);

  const tuple = {
    key,
    value
  };

  fs.writeFileSync(filePath, JSON.stringify(tuple, null, 2), "utf-8");

  return {
    DB_key: hashedKey,
    tuple
  };
}

module.exports = {
  createPair,
  readPair,
  updatePair,
  deletePair,
  pairExists,
  listPairs,
  overwritePair
};