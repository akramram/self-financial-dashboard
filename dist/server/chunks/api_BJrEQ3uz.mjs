async function createTransaction(tx) {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx)
  });
  return res.json();
}
async function updateTransactionApi(id, tx) {
  await fetch(`/api/transactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx)
  });
}
async function deleteTransactionApi(id) {
  await fetch(`/api/transactions/${id}`, { method: "DELETE" });
}
async function fetchNetworth() {
  const res = await fetch("/api/networth");
  return res.json();
}
async function createNetworth(record) {
  await fetch("/api/networth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record)
  });
}
async function updateNetworthApi(month, record) {
  await fetch(`/api/networth/${encodeURIComponent(month)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record)
  });
}

export { createNetworth as a, updateTransactionApi as b, createTransaction as c, deleteTransactionApi as d, fetchNetworth as f, updateNetworthApi as u };
