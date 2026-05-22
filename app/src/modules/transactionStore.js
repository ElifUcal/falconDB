const transactions = {};

function saveTransaction(transactionId, transaction) {
  transactions[transactionId] = {
    ...transaction,
    status: "prepared",
    createdAt: new Date()
  };
}

function getTransaction(transactionId) {
  return transactions[transactionId] || null;
}

function markCommitted(transactionId) {
  if (transactions[transactionId]) {
    transactions[transactionId].status = "committed";
  }
}

function markAborted(transactionId) {
  if (transactions[transactionId]) {
    transactions[transactionId].status = "aborted";
  }
}

function removeTransaction(transactionId) {
  delete transactions[transactionId];
}

function getAllTransactions() {
  return transactions;
}

module.exports = {
  saveTransaction,
  getTransaction,
  markCommitted,
  markAborted,
  removeTransaction,
  getAllTransactions
};