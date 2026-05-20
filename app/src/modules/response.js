function success(data) {
  return {
    data,
    error: 0
  };
}

function fail(code, message, errno = null) {
  const error = {
    code,
    message
  };

  if (errno !== null) {
    error.errno = errno;
  }

  return {
    data: 0,
    error
  };
}

// success ve fail durumlarını burdan bu hocanın spesifik isteği

module.exports = {
  success,
  fail
};