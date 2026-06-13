import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve("./data/financial.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
initSchema();
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL UNIQUE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL REFERENCES periods(id),
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'IDR',
      type TEXT NOT NULL CHECK(type IN ('cash', 'credit_expense', 'credit_payment')),
      payment_method TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      created_time TEXT
    );

    CREATE TABLE IF NOT EXISTS networth (
      period_id INTEGER PRIMARY KEY REFERENCES periods(id),
      date TEXT NOT NULL,
      total REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'IDR',
      month_over_month_change REAL,
      month_over_month_pct REAL
    );

    CREATE TABLE IF NOT EXISTS networth_breakdown (
      period_id INTEGER NOT NULL REFERENCES periods(id),
      investment TEXT NOT NULL,
      value REAL NOT NULL,
      PRIMARY KEY (period_id, investment)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      monthly_limit REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS monthly_income (
      period_id INTEGER PRIMARY KEY REFERENCES periods(id),
      date TEXT NOT NULL,
      income REAL NOT NULL DEFAULT 0,
      other_income REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('cash', 'credit_expense', 'credit_payment')),
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      done INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      target_amount REAL NOT NULL DEFAULT 0,
      current_amount REAL NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL,
      target_date TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT 'savings',
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ticker TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'stock' CHECK(type IN ('stock', 'crypto', 'etf', 'bond', 'mutual_fund', 'real_estate', 'other')),
      quantity REAL NOT NULL DEFAULT 0,
      avg_purchase_price REAL NOT NULL DEFAULT 0,
      current_price REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'IDR',
      platform TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      purchase_date TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tx_period ON transactions(period_id);
    CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_goals_completed ON goals(completed);
    CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(type);
  `);
  try {
    db.exec("ALTER TABLE transactions ADD COLUMN notes TEXT DEFAULT ''");
  } catch (_) {
  }
}
function getPeriodByMonth(month) {
  return db.prepare("SELECT * FROM periods WHERE month = ?").get(month);
}
function getAllPeriods() {
  return db.prepare("SELECT * FROM periods ORDER BY start_date ASC").all();
}
function ensurePeriod(month) {
  let p = db.prepare("SELECT id FROM periods WHERE month = ?").get(month);
  if (p) return p.id;
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const altNames = { "Oktober": "October" };
  const parts = month.split(" ");
  if (parts.length !== 2) throw new Error(`Cannot parse month: "${month}"`);
  let idx = monthNames.indexOf(parts[0]);
  if (idx === -1) idx = monthNames.indexOf(altNames[parts[0]] || "");
  if (idx === -1) throw new Error(`Unknown month name: "${parts[0]}"`);
  const year = parseInt(parts[1], 10);
  const m = idx + 1;
  const endDate = `${year}-${String(m).padStart(2, "0")}-20`;
  let prevM = m - 1, prevY = year;
  if (prevM === 0) {
    prevM = 12;
    prevY = year - 1;
  }
  const startDate = `${prevY}-${String(prevM).padStart(2, "0")}-21`;
  db.prepare("INSERT INTO periods (month, start_date, end_date) VALUES (?, ?, ?)").run(month, startDate, endDate);
  return db.prepare("SELECT id FROM periods WHERE month = ?").get(month).id;
}
function getTransactions(filters) {
  let sql = "SELECT * FROM transactions WHERE 1=1";
  const params = [];
  if (filters?.periodId) {
    sql += " AND period_id = ?";
    params.push(filters.periodId);
  }
  if (filters?.type) {
    sql += " AND type = ?";
    params.push(filters.type);
  }
  if (filters?.search) {
    sql += " AND (title LIKE ? OR category LIKE ?)";
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters?.category) {
    sql += " AND category = ?";
    params.push(filters.category);
  }
  sql += " ORDER BY COALESCE(created_time, date) DESC";
  return db.prepare(sql).all(...params);
}
function getTransactionById(id) {
  return db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
}
function normalizeTx(tx) {
  const copy = { ...tx };
  if (typeof copy.done === "boolean") copy.done = copy.done ? 1 : 0;
  if (copy.notes === void 0) copy.notes = "";
  return copy;
}
function insertTransaction(tx) {
  const normalized = normalizeTx(tx);
  if (!normalized.created_time) normalized.created_time = (/* @__PURE__ */ new Date()).toISOString();
  const stmt = db.prepare(`
    INSERT INTO transactions (period_id, date, title, category, amount, currency, type, payment_method, done, created_time, notes)
    VALUES (@period_id, @date, @title, @category, @amount, @currency, @type, @payment_method, @done, @created_time, @notes)
  `);
  const result = stmt.run(normalized);
  return result.lastInsertRowid;
}
function updateTransaction(id, tx) {
  const normalized = normalizeTx(tx);
  const fields = Object.keys(normalized).filter((k) => k !== "id" && k !== "created_time");
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(", ");
  const stmt = db.prepare(`UPDATE transactions SET ${setClause} WHERE id = @id`);
  stmt.run({ ...normalized, id });
}
function deleteTransaction(id) {
  db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
}
function deleteTransactionsBulk(ids) {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`).run(...ids);
}
function updateTransactionsBulk(ids, updates) {
  if (ids.length === 0) return { changes: 0 };
  const normalized = normalizeTx(updates);
  const fields = Object.keys(normalized).filter((k) => k !== "id" && k !== "created_time");
  if (fields.length === 0) return { changes: 0 };
  const setParts = fields.map((f) => `${f} = ?`);
  const setClause = setParts.join(", ");
  const idPlaceholders = ids.map(() => "?").join(",");
  const values = fields.map((f) => normalized[f]);
  const stmt = db.prepare(`UPDATE transactions SET ${setClause} WHERE id IN (${idPlaceholders})`);
  const result = stmt.run(...values, ...ids);
  return { changes: result.changes };
}
function findDuplicateTransaction(tx, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1e3).toISOString();
  const row = db.prepare(
    `SELECT id FROM transactions WHERE title = ? AND amount = ? AND category = ? AND type = ? AND created_time > ? LIMIT 1`
  ).get(tx.title, tx.amount, tx.category, tx.type, since);
  return row ? row.id : null;
}
function getNetworth() {
  const rows = db.prepare(`
    SELECT n.*, p.month, p.start_date, p.end_date
    FROM networth n JOIN periods p ON n.period_id = p.id
    ORDER BY p.start_date ASC
  `).all();
  for (const row of rows) {
    const breakdown = db.prepare("SELECT investment, value FROM networth_breakdown WHERE period_id = ?").all(row.period_id);
    row.breakdown = Object.fromEntries(breakdown.map((b) => [b.investment, b.value]));
  }
  return rows;
}
function getNetworthByPeriod(periodId) {
  const row = db.prepare(`
    SELECT n.*, p.month, p.start_date, p.end_date
    FROM networth n JOIN periods p ON n.period_id = p.id
    WHERE n.period_id = ?
  `).get(periodId);
  if (!row) return null;
  const breakdown = db.prepare("SELECT investment, value FROM networth_breakdown WHERE period_id = ?").all(periodId);
  row.breakdown = Object.fromEntries(breakdown.map((b) => [b.investment, b.value]));
  return row;
}
function upsertNetworth(record) {
  const existing = db.prepare("SELECT period_id FROM networth WHERE period_id = ?").get(record.period_id);
  if (existing) {
    db.prepare(`
      UPDATE networth SET date = @date, total = @total, currency = @currency,
      month_over_month_change = @month_over_month_change, month_over_month_pct = @month_over_month_pct
      WHERE period_id = @period_id
    `).run(record);
    db.prepare("DELETE FROM networth_breakdown WHERE period_id = ?").run(record.period_id);
  } else {
    db.prepare(`
      INSERT INTO networth (period_id, date, total, currency, month_over_month_change, month_over_month_pct)
      VALUES (@period_id, @date, @total, @currency, @month_over_month_change, @month_over_month_pct)
    `).run(record);
  }
  const insertBreakdown = db.prepare(`
    INSERT INTO networth_breakdown (period_id, investment, value) VALUES (@period_id, @investment, @value)
  `);
  for (const [investment, value] of Object.entries(record.breakdown || {})) {
    insertBreakdown.run({ period_id: record.period_id, investment, value });
  }
}
function deleteNetworth(periodId) {
  db.prepare("DELETE FROM networth WHERE period_id = ?").run(periodId);
}
function getCategories() {
  return db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
}
function getCategoryById(id) {
  return db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
}
function getCategoryByName(name) {
  return db.prepare("SELECT * FROM categories WHERE name = ? COLLATE NOCASE").get(name);
}
function insertCategory(cat) {
  const stmt = db.prepare(`
    INSERT INTO categories (name, color, monthly_limit)
    VALUES (@name, @color, @monthly_limit)
  `);
  const result = stmt.run({
    name: cat.name,
    color: cat.color,
    monthly_limit: cat.monthly_limit ?? 0
  });
  return result.lastInsertRowid;
}
function updateCategory(id, cat) {
  const fields = Object.keys(cat).filter((k) => k !== "id");
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(", ");
  const stmt = db.prepare(`UPDATE categories SET ${setClause} WHERE id = @id`);
  stmt.run({ ...cat, id });
}
function deleteCategory(id) {
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
}
function getMonthlySummary() {
  const periodRows = db.prepare(`
    SELECT DISTINCT p.id, p.month, p.start_date, p.end_date
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    ORDER BY p.start_date ASC
  `).all();
  const summaries = [];
  for (const p of periodRows) {
    const tx = db.prepare("SELECT * FROM transactions WHERE period_id = ? AND done = 1").all(p.id);
    const cash = tx.filter((t) => t.type === "cash").reduce((s, t) => s + t.amount, 0);
    const credit_payment = tx.filter((t) => t.type === "credit_payment").reduce((s, t) => s + t.amount, 0);
    const credit_expenses = tx.filter((t) => t.type === "credit_expense").reduce((s, t) => s + t.amount, 0);
    const total_outcome = cash + credit_payment;
    const nw = db.prepare("SELECT total FROM networth WHERE period_id = ?").get(p.id);
    const category_totals = {};
    tx.filter((t) => t.type === "cash" || t.type === "credit_expense" || t.type === "credit_payment").forEach((t) => {
      category_totals[t.category] = (category_totals[t.category] || 0) + t.amount;
    });
    summaries.push({
      period_id: p.id,
      month: p.month,
      date: p.start_date,
      start_date: p.start_date,
      end_date: p.end_date,
      income: 0,
      outcome: { cash, credit_payment, credit_expenses, total: total_outcome },
      savings: 0,
      savings_rate_pct: 0,
      networth: nw?.total || 0,
      category_totals
    });
  }
  return summaries;
}
function getMonthlyIncome() {
  return db.prepare(`
    SELECT mi.*, p.month, p.start_date, p.end_date
    FROM monthly_income mi JOIN periods p ON mi.period_id = p.id
    ORDER BY p.start_date ASC
  `).all();
}
function getMonthlyIncomeByPeriod(periodId) {
  return db.prepare(`
    SELECT mi.*, p.month, p.start_date, p.end_date
    FROM monthly_income mi JOIN periods p ON mi.period_id = p.id
    WHERE mi.period_id = ?
  `).get(periodId);
}
function upsertMonthlyIncome(record) {
  const existing = db.prepare("SELECT period_id FROM monthly_income WHERE period_id = ?").get(record.period_id);
  if (existing) {
    db.prepare(`
      UPDATE monthly_income SET date = @date, income = @income, other_income = @other_income WHERE period_id = @period_id
    `).run({
      period_id: record.period_id,
      date: record.date,
      income: record.income,
      other_income: record.other_income ?? 0
    });
  } else {
    db.prepare(`
      INSERT INTO monthly_income (period_id, date, income, other_income)
      VALUES (@period_id, @date, @income, @other_income)
    `).run({
      period_id: record.period_id,
      date: record.date,
      income: record.income,
      other_income: record.other_income ?? 0
    });
  }
}
function deleteMonthlyIncome(periodId) {
  db.prepare("DELETE FROM monthly_income WHERE period_id = ?").run(periodId);
}
function getRecurringTransactions() {
  return db.prepare("SELECT * FROM recurring_transactions ORDER BY active DESC, created_at ASC").all();
}
function getRecurringTransactionById(id) {
  return db.prepare("SELECT * FROM recurring_transactions WHERE id = ?").get(id);
}
function insertRecurringTransaction(tx) {
  const stmt = db.prepare(`
    INSERT INTO recurring_transactions (title, category, amount, type, payment_method, done, active, created_at)
    VALUES (@title, @category, @amount, @type, @payment_method, @done, @active, @created_at)
  `);
  const result = stmt.run({
    title: tx.title,
    category: tx.category,
    amount: Number(tx.amount),
    type: tx.type,
    payment_method: tx.payment_method || "Cash",
    done: tx.done ? 1 : 0,
    active: tx.active !== false ? 1 : 0,
    created_at: tx.created_at || (/* @__PURE__ */ new Date()).toISOString()
  });
  return result.lastInsertRowid;
}
function updateRecurringTransaction(id, tx) {
  const fields = Object.keys(tx).filter((k) => k !== "id");
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(", ");
  const stmt = db.prepare(`UPDATE recurring_transactions SET ${setClause} WHERE id = @id`);
  stmt.run({ ...tx, id });
}
function deleteRecurringTransaction(id) {
  db.prepare("DELETE FROM recurring_transactions WHERE id = ?").run(id);
}
function recalcNetworthMoM() {
  const rows = db.prepare(`
    SELECT n.period_id, n.total, p.start_date
    FROM networth n JOIN periods p ON n.period_id = p.id
    ORDER BY p.start_date ASC
  `).all();
  let prev = null;
  for (const row of rows) {
    if (prev === null) {
      db.prepare("UPDATE networth SET month_over_month_change = NULL, month_over_month_pct = NULL WHERE period_id = ?").run(row.period_id);
    } else {
      const change = Number((row.total - prev).toFixed(2));
      const pct = prev > 0 ? Number(((row.total - prev) / prev * 100).toFixed(2)) : null;
      db.prepare("UPDATE networth SET month_over_month_change = ?, month_over_month_pct = ? WHERE period_id = ?").run(change, pct, row.period_id);
    }
    prev = row.total;
  }
}
function getGoals() {
  return db.prepare("SELECT * FROM goals ORDER BY completed ASC, target_date ASC").all();
}
function getGoalById(id) {
  return db.prepare("SELECT * FROM goals WHERE id = ?").get(id);
}
function insertGoal(goal) {
  const stmt = db.prepare(`
    INSERT INTO goals (name, description, target_amount, current_amount, start_date, target_date, color, icon, completed, updated_at)
    VALUES (@name, @description, @target_amount, @current_amount, @start_date, @target_date, @color, @icon, 0, CURRENT_TIMESTAMP)
  `);
  const result = stmt.run({
    name: goal.name,
    description: goal.description ?? "",
    target_amount: Number(goal.target_amount),
    current_amount: Number(goal.current_amount ?? 0),
    start_date: goal.start_date,
    target_date: goal.target_date,
    color: goal.color ?? "#6366f1",
    icon: goal.icon ?? "savings"
  });
  return result.lastInsertRowid;
}
function updateGoal(id, goal) {
  const fields = Object.keys(goal).filter((k) => k !== "id");
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(", ");
  const stmt = db.prepare(`UPDATE goals SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
  stmt.run({ ...goal, id });
}
function deleteGoal(id) {
  db.prepare("DELETE FROM goals WHERE id = ?").run(id);
}
function getDailySpending(periodId) {
  return db.prepare(`
    SELECT
      SUBSTR(COALESCE(created_time, date), 1, 10) AS day,
      COUNT(*) AS tx_count,
      SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) AS paid_amount,
      SUM(amount) AS total_amount
    FROM transactions
    WHERE period_id = ?
    GROUP BY day
    ORDER BY day ASC
  `).all(periodId);
}
function getDayOfWeekSpending() {
  return db.prepare(`
    SELECT
      CAST(strftime('%w', COALESCE(created_time, date)) AS INTEGER) AS dow,
      COUNT(*) AS tx_count,
      SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) AS paid_amount,
      AVG(CASE WHEN done = 1 THEN amount ELSE 0 END) AS avg_paid
    FROM transactions
    WHERE done = 1
    GROUP BY dow
    ORDER BY dow ASC
  `).all();
}
function getTransactionStats(periodId) {
  const rows = db.prepare(`
    SELECT amount, category, title, type, done, COALESCE(created_time, date) AS tx_date
    FROM transactions WHERE period_id = ?
  `).all(periodId);
  if (rows.length === 0) {
    return {
      total: 0,
      count: 0,
      paid_count: 0,
      unpaid_count: 0,
      avg_amount: 0,
      median_amount: 0,
      min_amount: 0,
      max_amount: 0,
      largest_title: "",
      smallest_title: "",
      paid_amount: 0,
      unpaid_amount: 0
    };
  }
  const paid = rows.filter((r) => r.done);
  const paidAmounts = paid.map((r) => r.amount).sort((a, b) => a - b);
  rows.map((r) => r.amount).sort((a, b) => a - b);
  const median = (arr) => {
    if (arr.length === 0) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  };
  const largest = paid.reduce((max, r) => r.amount > max.amount ? r : max, paid[0]);
  const smallest = paid.length > 0 ? paid.reduce((min, r) => r.amount < min.amount ? r : min, paid[0]) : rows[0];
  return {
    total: paid.reduce((s, r) => s + r.amount, 0),
    count: rows.length,
    paid_count: paid.length,
    unpaid_count: rows.length - paid.length,
    avg_amount: paid.length > 0 ? paid.reduce((s, r) => s + r.amount, 0) / paid.length : 0,
    median_amount: median(paidAmounts),
    min_amount: paid.length > 0 ? paidAmounts[0] : 0,
    max_amount: paid.length > 0 ? paidAmounts[paidAmounts.length - 1] : 0,
    largest_title: largest?.title ?? "",
    smallest_title: smallest?.title ?? "",
    paid_amount: paid.reduce((s, r) => s + r.amount, 0),
    unpaid_amount: rows.filter((r) => !r.done).reduce((s, r) => s + r.amount, 0)
  };
}
function getMonthlySpendingByCategory(periodId) {
  const rows = db.prepare(`
    SELECT category, type, SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) AS spent,
           SUM(amount) AS total_amount, COUNT(*) AS tx_count
    FROM transactions WHERE period_id = ?
    GROUP BY category, type
  `).all(periodId);
  return rows;
}
function getCreditStatus(periodId) {
  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'credit_expense' AND done = 1 THEN amount ELSE 0 END) AS credit_expenses_paid,
      SUM(CASE WHEN type = 'credit_expense' THEN amount ELSE 0 END) AS credit_expenses_total,
      SUM(CASE WHEN type = 'credit_payment' AND done = 1 THEN amount ELSE 0 END) AS credit_payments_paid,
      SUM(CASE WHEN type = 'credit_payment' THEN amount ELSE 0 END) AS credit_payments_total
    FROM transactions WHERE period_id = ?
  `).get(periodId);
  return row || { credit_expenses_paid: 0, credit_expenses_total: 0, credit_payments_paid: 0, credit_payments_total: 0 };
}
function getRecentMonthlyTotals(limit = 6) {
  const periodRows = db.prepare(`
    SELECT DISTINCT p.id, p.month, p.start_date, MIN(t.created_time) AS first_tx
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    GROUP BY p.id
    ORDER BY p.start_date DESC LIMIT ?
  `).all(limit);
  const result = [];
  for (const p of periodRows) {
    const row = db.prepare(`
      SELECT SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) AS total,
             MIN(COALESCE(created_time, date)) AS earliest,
             MAX(COALESCE(created_time, date)) AS latest
      FROM transactions WHERE period_id = ?
    `).get(p.id);
    if (row && row.earliest) {
      const earliest = new Date(row.earliest);
      const latest = new Date(row.latest);
      const days = Math.max(1, Math.ceil((latest.getTime() - earliest.getTime()) / (1e3 * 60 * 60 * 24)) + 1);
      result.push({
        period_id: p.id,
        month: p.month,
        total: row.total || 0,
        days,
        daily_avg: (row.total || 0) / days,
        month_start: p.start_date
      });
    }
  }
  return result.reverse();
}
function getCumulativeDailySpending(periodId) {
  const daily = getDailySpending(periodId);
  let cumulative = 0;
  return daily.map((d) => {
    cumulative += d.paid_amount;
    return { day: d.day, amount: d.paid_amount, cumulative };
  });
}
function getAllMonthsWithSpending() {
  return db.prepare(`
    SELECT p.id AS period_id, p.month, p.start_date, p.end_date
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    GROUP BY p.id
    ORDER BY p.start_date ASC
  `).all();
}
function getSpendingVelocity(periodId) {
  const periodRows = db.prepare(`
    SELECT DISTINCT p.id, p.month, p.start_date
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    GROUP BY p.id
    ORDER BY p.start_date DESC LIMIT 4
  `).all();
  const periodIds = periodRows.map((p) => p.id);
  periodIds.indexOf(periodId);
  const currentDaily = getDailySpending(periodId);
  const daysWithSpending = currentDaily.filter((d) => d.paid_amount > 0);
  const allDays = [];
  for (const pid of periodIds) {
    const daily = getDailySpending(pid);
    daily.forEach((d) => allDays.push({ period_id: pid, day: d.day, paid_amount: d.paid_amount }));
  }
  const allSpendingDays = allDays.filter((d) => d.paid_amount > 0);
  const historicalAvgDaily = allSpendingDays.length > 0 ? allSpendingDays.reduce((s, d) => s + d.paid_amount, 0) / allSpendingDays.length : 0;
  const currentAvgDaily = daysWithSpending.length > 0 ? daysWithSpending.reduce((s, d) => s + d.paid_amount, 0) / daysWithSpending.length : 0;
  const cumulative = currentDaily.reduce((s, d) => s + d.paid_amount, 0);
  currentDaily.length || 1;
  return {
    current_avg_daily: currentAvgDaily,
    historical_avg_daily: historicalAvgDaily,
    days_with_spending: daysWithSpending.length,
    days_tracked: currentDaily.length,
    cumulative_spend: cumulative,
    projected_monthly: currentAvgDaily * 30,
    velocity_vs_history: historicalAvgDaily > 0 ? (currentAvgDaily - historicalAvgDaily) / historicalAvgDaily * 100 : 0
  };
}
function getTitleSpending(periodId) {
  return db.prepare(`
    SELECT
      title,
      category,
      SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) as paid_amount,
      SUM(amount) as total_amount,
      COUNT(*) as tx_count,
      AVG(amount) as avg_amount,
      MAX(amount) as max_amount,
      MIN(amount) as min_amount
    FROM transactions
    WHERE period_id = ?
    GROUP BY title
    ORDER BY SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) DESC
  `).all(periodId);
}
function getInvestments() {
  return db.prepare("SELECT * FROM investments ORDER BY type ASC, name ASC").all();
}
function getInvestmentById(id) {
  return db.prepare("SELECT * FROM investments WHERE id = ?").get(id);
}
function insertInvestment(inv) {
  const stmt = db.prepare(`
    INSERT INTO investments (name, ticker, type, quantity, avg_purchase_price, current_price, currency, platform, notes, purchase_date)
    VALUES (@name, @ticker, @type, @quantity, @avg_purchase_price, @current_price, @currency, @platform, @notes, @purchase_date)
  `);
  const result = stmt.run({
    name: inv.name,
    ticker: inv.ticker ?? "",
    type: inv.type ?? "stock",
    quantity: Number(inv.quantity ?? 0),
    avg_purchase_price: Number(inv.avg_purchase_price ?? 0),
    current_price: Number(inv.current_price ?? 0),
    currency: inv.currency ?? "IDR",
    platform: inv.platform ?? "",
    notes: inv.notes ?? "",
    purchase_date: inv.purchase_date ?? ""
  });
  return result.lastInsertRowid;
}
function updateInvestment(id, inv) {
  const fields = Object.keys(inv).filter((k) => k !== "id");
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(", ");
  const stmt = db.prepare(`UPDATE investments SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
  stmt.run({ ...inv, id });
}
function deleteInvestment(id) {
  db.prepare("DELETE FROM investments WHERE id = ?").run(id);
}
function getPortfolioSummary() {
  const rows = db.prepare("SELECT * FROM investments").all();
  let totalInvested = 0;
  let totalCurrentValue = 0;
  const byType = {};
  for (const row of rows) {
    const invested = row.avg_purchase_price * row.quantity;
    const currentValue = row.current_price * row.quantity;
    totalInvested += invested;
    totalCurrentValue += currentValue;
    if (!byType[row.type]) {
      byType[row.type] = { invested: 0, currentValue: 0, count: 0 };
    }
    byType[row.type].invested += invested;
    byType[row.type].currentValue += currentValue;
    byType[row.type].count++;
  }
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPct = totalInvested > 0 ? totalGainLoss / totalInvested * 100 : 0;
  return {
    totalInvested,
    totalCurrentValue,
    totalGainLoss,
    totalGainLossPct,
    holdingsCount: rows.length,
    byType
  };
}
function getAnomalies(periodId) {
  const currentTxs = db.prepare(`
    SELECT id, title, category, amount, type, created_time, done
    FROM transactions WHERE period_id = ? AND done = 1
  `).all(periodId);
  if (currentTxs.length === 0) return [];
  const historicalPeriods = db.prepare(`
    SELECT DISTINCT p.id
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    WHERE p.id != ?
    ORDER BY p.start_date ASC
  `).all(periodId);
  const histIds = historicalPeriods.map((p) => p.id);
  const allHistorical = histIds.length > 0 ? db.prepare(`
        SELECT id, title, category, amount, type, created_time
        FROM transactions WHERE period_id IN (${histIds.map(() => "?").join(",")}) AND done = 1
      `).all(...histIds) : [];
  const catStats = {};
  for (const tx of allHistorical) {
    if (!catStats[tx.category]) catStats[tx.category] = { mean: 0, stddev: 0, amounts: [] };
    catStats[tx.category].amounts.push(tx.amount);
  }
  for (const cat of Object.keys(catStats)) {
    const amounts = catStats[cat].amounts;
    const n = amounts.length;
    const mean = amounts.reduce((s, a) => s + a, 0) / n;
    catStats[cat].mean = mean;
    if (n > 1) {
      const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / (n - 1);
      catStats[cat].stddev = Math.sqrt(variance);
    } else {
      catStats[cat].stddev = mean * 0.5;
    }
  }
  const historicalTitles = new Set(allHistorical.map((tx) => tx.title.toLowerCase().trim()));
  const anomalies = [];
  for (const tx of currentTxs) {
    const stats = catStats[tx.category];
    if (stats && stats.amounts.length >= 2) {
      const threshold = stats.mean + 2.5 * stats.stddev;
      if (tx.amount > threshold && tx.amount > stats.mean * 1.5) {
        const zScore = stats.stddev > 0 ? (tx.amount - stats.mean) / stats.stddev : 0;
        anomalies.push({
          id: tx.id,
          title: tx.title,
          category: tx.category,
          amount: tx.amount,
          type: tx.type,
          created_time: tx.created_time,
          reason: "amount_spike",
          severity: zScore > 4 ? "high" : zScore > 3 ? "medium" : "low",
          detail: `${zScore.toFixed(1)}x above avg (avg ${formatIdrShort(stats.mean)}, this ${formatIdrShort(tx.amount)})`
        });
        continue;
      }
    }
    const titleKey = tx.title.toLowerCase().trim();
    if (!historicalTitles.has(titleKey) && historicalTitles.size > 0) {
      if (tx.amount > 1e4) {
        anomalies.push({
          id: tx.id,
          title: tx.title,
          category: tx.category,
          amount: tx.amount,
          type: tx.type,
          created_time: tx.created_time,
          reason: "new_merchant",
          severity: tx.amount > 5e5 ? "medium" : "low",
          detail: `First time seeing "${tx.title}" — new spending pattern?`
        });
      }
    }
  }
  return anomalies;
}
function formatIdrShort(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return Math.round(n).toString();
}

export { findDuplicateTransaction as $, getGoals as A, insertGoal as B, ensurePeriod as C, insertTransaction as D, upsertNetworth as E, upsertMonthlyIncome as F, deleteMonthlyIncome as G, getMonthlyIncomeByPeriod as H, getMonthlyIncome as I, getPortfolioSummary as J, getInvestmentById as K, deleteInvestment as L, updateInvestment as M, getInvestments as N, insertInvestment as O, getRecurringTransactions as P, deleteNetworth as Q, recalcNetworthMoM as R, getNetworthByPeriod as S, deleteRecurringTransaction as T, getRecurringTransactionById as U, updateRecurringTransaction as V, insertRecurringTransaction as W, deleteTransaction as X, getTransactionById as Y, updateTransaction as Z, deleteTransactionsBulk as _, getCategories as a, updateTransactionsBulk as a0, getPeriodByMonth as b, getDailySpending as c, db as d, getDayOfWeekSpending as e, getTransactionStats as f, getMonthlySummary as g, getSpendingVelocity as h, getTitleSpending as i, getAnomalies as j, deleteCategory as k, getCategoryById as l, getCategoryByName as m, insertCategory as n, getAllPeriods as o, getTransactions as p, getNetworth as q, getAllMonthsWithSpending as r, getCumulativeDailySpending as s, getRecentMonthlyTotals as t, updateCategory as u, getMonthlySpendingByCategory as v, getCreditStatus as w, getGoalById as x, deleteGoal as y, updateGoal as z };
