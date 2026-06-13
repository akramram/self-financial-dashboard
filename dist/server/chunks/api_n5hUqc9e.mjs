async function fetchTransactions(filters) {
  const params = new URLSearchParams();
  if (filters?.periodId) params.set("period_id", String(filters.periodId));
  if (filters?.type) params.set("type", filters.type);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.category) params.set("category", filters.category);
  const res = await fetch(`/api/transactions?${params.toString()}`);
  return res.json();
}
async function updateTransactionApi(id, tx) {
  await fetch(`/api/transactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx)
  });
}
async function toggleTransactionDoneApi(id, done) {
  await fetch(`/api/transactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done })
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
async function updateNetworthApi(periodId, record) {
  await fetch(`/api/networth/${periodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record)
  });
}
async function fetchCategories() {
  const res = await fetch("/api/categories");
  return res.json();
}
async function createCategory(cat) {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cat)
  });
  return res.json();
}
async function updateCategoryApi(id, cat) {
  await fetch(`/api/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cat)
  });
}
async function deleteCategoryApi(id) {
  await fetch(`/api/categories/${id}`, { method: "DELETE" });
}
async function deleteTransactionsBulkApi(ids) {
  await fetch("/api/transactions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids })
  });
}
async function updateTransactionsBulkApi(ids, updates) {
  const res = await fetch("/api/transactions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, updates })
  });
  return res.json();
}
async function fetchMonthlyIncome() {
  const res = await fetch("/api/income");
  return res.json();
}
async function upsertMonthlyIncomeApi(record) {
  await fetch("/api/income", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record)
  });
}
async function updateMonthlyIncomeApi(periodId, record) {
  await fetch(`/api/income/${periodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record)
  });
}
async function deleteMonthlyIncomeApi(periodId) {
  await fetch(`/api/income/${periodId}`, { method: "DELETE" });
}
async function fetchRecurringTransactions() {
  const res = await fetch("/api/recurring");
  return res.json();
}
async function createRecurringTransaction(tx) {
  const res = await fetch("/api/recurring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx)
  });
  return res.json();
}
async function updateRecurringTransactionApi(id, tx) {
  await fetch(`/api/recurring/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx)
  });
}
async function deleteRecurringTransactionApi(id) {
  await fetch(`/api/recurring/${id}`, { method: "DELETE" });
}
async function kickoffMonth(month, salary) {
  const res = await fetch("/api/kickoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month, salary })
  });
  return res.json();
}
async function importDataApi(type, rows) {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, rows })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Import failed" }));
    throw new Error(err.error || "Import failed");
  }
  return res.json();
}
async function fetchGoals() {
  const res = await fetch("/api/goals");
  return res.json();
}
async function createGoalApi(goal) {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(goal)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create goal" }));
    throw new Error(err.error || "Failed to create goal");
  }
  return res.json();
}
async function updateGoalApi(id, goal) {
  await fetch(`/api/goals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(goal)
  });
}
async function deleteGoalApi(id) {
  await fetch(`/api/goals/${id}`, { method: "DELETE" });
}
async function fetchInvestments() {
  const res = await fetch("/api/investments");
  return res.json();
}
async function createInvestmentApi(inv) {
  const res = await fetch("/api/investments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inv)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create investment" }));
    throw new Error(err.error || "Failed to create investment");
  }
  return res.json();
}
async function updateInvestmentApi(id, inv) {
  await fetch(`/api/investments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inv)
  });
}
async function deleteInvestmentApi(id) {
  await fetch(`/api/investments/${id}`, { method: "DELETE" });
}
async function fetchPortfolioSummary() {
  const res = await fetch("/api/investments/summary");
  return res.json();
}

export { toggleTransactionDoneApi as A, deleteTransactionApi as B, updateTransactionApi as C, deleteTransactionsBulkApi as D, updateTransactionsBulkApi as E, kickoffMonth as F, fetchNetworth as a, fetchTransactions as b, createNetworth as c, fetchGoals as d, createGoalApi as e, fetchCategories as f, deleteGoalApi as g, updateNetworthApi as h, fetchInvestments as i, fetchPortfolioSummary as j, updateInvestmentApi as k, createInvestmentApi as l, deleteInvestmentApi as m, fetchRecurringTransactions as n, updateRecurringTransactionApi as o, deleteRecurringTransactionApi as p, createRecurringTransaction as q, updateCategoryApi as r, deleteCategoryApi as s, createCategory as t, updateGoalApi as u, fetchMonthlyIncome as v, updateMonthlyIncomeApi as w, deleteMonthlyIncomeApi as x, upsertMonthlyIncomeApi as y, importDataApi as z };
