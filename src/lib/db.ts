import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve('./data/financial.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

initSchema();

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
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
      month TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      total REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'IDR',
      month_over_month_change REAL,
      month_over_month_pct REAL
    );

    CREATE TABLE IF NOT EXISTS networth_breakdown (
      month TEXT NOT NULL,
      investment TEXT NOT NULL,
      value REAL NOT NULL,
      PRIMARY KEY (month, investment),
      FOREIGN KEY (month) REFERENCES networth(month) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      monthly_limit REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS monthly_income (
      month TEXT PRIMARY KEY,
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

    CREATE INDEX IF NOT EXISTS idx_tx_month ON transactions(month);
    CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_goals_completed ON goals(completed);
    CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(type);
  `);

  // Migrations for columns added after initial schema
  try { db.exec('ALTER TABLE transactions ADD COLUMN notes TEXT DEFAULT \'\''); } catch (_) { /* already exists */ }
}

export function getTransactions(filters?: { month?: string; type?: string; search?: string; category?: string }) {
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params: any[] = [];
  if (filters?.month) {
    sql += ' AND month = ?';
    params.push(filters.month);
  }
  if (filters?.type) {
    sql += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters?.search) {
    sql += ' AND (title LIKE ? OR category LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters?.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }
  sql += ' ORDER BY COALESCE(created_time, date) DESC';
  return db.prepare(sql).all(...params) as any[];
}

export function getTransactionById(id: number) {
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
}

function normalizeTx(tx: any) {
  const copy = { ...tx };
  if (typeof copy.done === 'boolean') copy.done = copy.done ? 1 : 0;
  if (copy.notes === undefined) copy.notes = '';
  return copy;
}

export function insertTransaction(tx: Omit<any, 'id'>) {
  const normalized = normalizeTx(tx);
  if (!normalized.created_time) normalized.created_time = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO transactions (month, date, title, category, amount, currency, type, payment_method, done, created_time, notes)
    VALUES (@month, @date, @title, @category, @amount, @currency, @type, @payment_method, @done, @created_time, @notes)
  `);
  const result = stmt.run(normalized);
  return result.lastInsertRowid as number;
}

export function updateTransaction(id: number, tx: Partial<any>) {
  const normalized = normalizeTx(tx);
  const fields = Object.keys(normalized).filter((k) => k !== 'id' && k !== 'created_time');
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
  const stmt = db.prepare(`UPDATE transactions SET ${setClause} WHERE id = @id`);
  stmt.run({ ...normalized, id });
}

export function deleteTransaction(id: number) {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
}

export function deleteTransactionsBulk(ids: number[]) {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`).run(...ids);
}

export function updateTransactionsBulk(ids: number[], updates: Partial<any>) {
  if (ids.length === 0) return { changes: 0 };
  const normalized = normalizeTx(updates);
  const fields = Object.keys(normalized).filter((k) => k !== 'id' && k !== 'created_time');
  if (fields.length === 0) return { changes: 0 };
  // Use positional placeholders for both SET values and IN clause
  const setParts = fields.map((f) => `${f} = ?`);
  const setClause = setParts.join(', ');
  const idPlaceholders = ids.map(() => '?').join(',');
  const values = fields.map((f) => normalized[f]);
  const stmt = db.prepare(`UPDATE transactions SET ${setClause} WHERE id IN (${idPlaceholders})`);
  const result = stmt.run(...values, ...ids);
  return { changes: result.changes };
}

export function findDuplicateTransaction(tx: { title: string; amount: number; category: string; type: string }, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const row = db.prepare(
    `SELECT id FROM transactions WHERE title = ? AND amount = ? AND category = ? AND type = ? AND created_time > ? LIMIT 1`
  ).get(tx.title, tx.amount, tx.category, tx.type, since);
  return row ? (row as any).id : null;
}

export function getNetworth() {
  const rows = db.prepare('SELECT * FROM networth ORDER BY date ASC').all() as any[];
  for (const row of rows) {
    const breakdown = db.prepare('SELECT investment, value FROM networth_breakdown WHERE month = ?').all(row.month) as any[];
    row.breakdown = Object.fromEntries(breakdown.map((b) => [b.investment, b.value]));
  }
  return rows;
}

export function getNetworthByMonth(month: string) {
  const row = db.prepare('SELECT * FROM networth WHERE month = ?').get(month) as any;
  if (!row) return null;
  const breakdown = db.prepare('SELECT investment, value FROM networth_breakdown WHERE month = ?').all(month) as any[];
  row.breakdown = Object.fromEntries(breakdown.map((b) => [b.investment, b.value]));
  return row;
}

export function upsertNetworth(record: any) {
  const existing = db.prepare('SELECT month FROM networth WHERE month = ?').get(record.month);
  if (existing) {
    db.prepare(`
      UPDATE networth SET date = @date, total = @total, currency = @currency,
      month_over_month_change = @month_over_month_change, month_over_month_pct = @month_over_month_pct
      WHERE month = @month
    `).run(record);
    db.prepare('DELETE FROM networth_breakdown WHERE month = ?').run(record.month);
  } else {
    db.prepare(`
      INSERT INTO networth (month, date, total, currency, month_over_month_change, month_over_month_pct)
      VALUES (@month, @date, @total, @currency, @month_over_month_change, @month_over_month_pct)
    `).run(record);
  }
  const insertBreakdown = db.prepare(`
    INSERT INTO networth_breakdown (month, investment, value) VALUES (@month, @investment, @value)
  `);
  for (const [investment, value] of Object.entries(record.breakdown || {})) {
    insertBreakdown.run({ month: record.month, investment, value: value as number });
  }
}

export function deleteNetworth(month: string) {
  db.prepare('DELETE FROM networth WHERE month = ?').run(month);
}

export function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY name ASC').all() as any[];
}

export function getCategoryById(id: number) {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any;
}

export function getCategoryByName(name: string) {
  return db.prepare('SELECT * FROM categories WHERE name = ? COLLATE NOCASE').get(name) as any;
}

export function insertCategory(cat: { name: string; color: string; monthly_limit?: number }) {
  const stmt = db.prepare(`
    INSERT INTO categories (name, color, monthly_limit)
    VALUES (@name, @color, @monthly_limit)
  `);
  const result = stmt.run({
    name: cat.name,
    color: cat.color,
    monthly_limit: cat.monthly_limit ?? 0,
  });
  return result.lastInsertRowid as number;
}

export function updateCategory(id: number, cat: Partial<{ name: string; color: string; monthly_limit: number }>) {
  const fields = Object.keys(cat).filter((k) => k !== 'id');
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
  const stmt = db.prepare(`UPDATE categories SET ${setClause} WHERE id = @id`);
  stmt.run({ ...cat, id });
}

export function deleteCategory(id: number) {
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
}

export function getMonthlySummary() {
  const months = db.prepare(`
    SELECT DISTINCT month, MIN(date) as date FROM transactions GROUP BY month ORDER BY MIN(date) ASC
  `).all() as any[];

  const summaries = [];
  for (const { month, date } of months) {
    const tx = db.prepare('SELECT * FROM transactions WHERE month = ? AND done = 1').all(month) as any[];
    const cash = tx.filter((t) => t.type === 'cash').reduce((s, t) => s + t.amount, 0);
    const credit_payment = tx.filter((t) => t.type === 'credit_payment').reduce((s, t) => s + t.amount, 0);
    const credit_expenses = tx.filter((t) => t.type === 'credit_expense').reduce((s, t) => s + t.amount, 0);
    const total_outcome = cash + credit_payment;

    const nw = db.prepare('SELECT total FROM networth WHERE month = ?').get(month) as any;

    const category_totals: Record<string, number> = {};
    tx.filter((t) => t.type === 'cash' || t.type === 'credit_expense' || t.type === 'credit_payment').forEach((t) => {
      category_totals[t.category] = (category_totals[t.category] || 0) + t.amount;
    });

    summaries.push({
      month,
      date,
      income: 0,
      outcome: { cash, credit_payment, credit_expenses, total: total_outcome },
      savings: 0,
      savings_rate_pct: 0,
      networth: nw?.total || 0,
      category_totals,
    });
  }
  return summaries;
}

export function getMonthlyIncome() {
  return db.prepare('SELECT * FROM monthly_income ORDER BY date ASC').all() as any[];
}

export function getMonthlyIncomeByMonth(month: string) {
  return db.prepare('SELECT * FROM monthly_income WHERE month = ?').get(month) as any;
}

export function upsertMonthlyIncome(record: { month: string; date: string; income: number; other_income?: number }) {
  const existing = db.prepare('SELECT month FROM monthly_income WHERE month = ?').get(record.month);
  if (existing) {
    db.prepare(`
      UPDATE monthly_income SET date = @date, income = @income, other_income = @other_income WHERE month = @month
    `).run({
      month: record.month,
      date: record.date,
      income: record.income,
      other_income: record.other_income ?? 0,
    });
  } else {
    db.prepare(`
      INSERT INTO monthly_income (month, date, income, other_income)
      VALUES (@month, @date, @income, @other_income)
    `).run({
      month: record.month,
      date: record.date,
      income: record.income,
      other_income: record.other_income ?? 0,
    });
  }
}

export function deleteMonthlyIncome(month: string) {
  db.prepare('DELETE FROM monthly_income WHERE month = ?').run(month);
}

export function getRecurringTransactions() {
  return db.prepare('SELECT * FROM recurring_transactions ORDER BY active DESC, created_at ASC').all() as any[];
}

export function getRecurringTransactionById(id: number) {
  return db.prepare('SELECT * FROM recurring_transactions WHERE id = ?').get(id) as any;
}

export function insertRecurringTransaction(tx: Omit<any, 'id'>) {
  const stmt = db.prepare(`
    INSERT INTO recurring_transactions (title, category, amount, type, payment_method, done, active, created_at)
    VALUES (@title, @category, @amount, @type, @payment_method, @done, @active, @created_at)
  `);
  const result = stmt.run({
    title: tx.title,
    category: tx.category,
    amount: Number(tx.amount),
    type: tx.type,
    payment_method: tx.payment_method || 'Cash',
    done: tx.done ? 1 : 0,
    active: tx.active !== false ? 1 : 0,
    created_at: tx.created_at || new Date().toISOString(),
  });
  return result.lastInsertRowid as number;
}

export function updateRecurringTransaction(id: number, tx: Partial<any>) {
  const fields = Object.keys(tx).filter((k) => k !== 'id');
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
  const stmt = db.prepare(`UPDATE recurring_transactions SET ${setClause} WHERE id = @id`);
  stmt.run({ ...tx, id });
}

export function deleteRecurringTransaction(id: number) {
  db.prepare('DELETE FROM recurring_transactions WHERE id = ?').run(id);
}

export function recalcNetworthMoM() {
  const rows = db.prepare('SELECT month, date, total FROM networth ORDER BY date ASC').all() as any[];
  let prev: number | null = null;
  for (const row of rows) {
    if (prev === null) {
      db.prepare('UPDATE networth SET month_over_month_change = NULL, month_over_month_pct = NULL WHERE month = ?').run(row.month);
    } else {
      const change = Number((row.total - prev).toFixed(2));
      const pct = prev > 0 ? Number(((row.total - prev) / prev * 100).toFixed(2)) : null;
      db.prepare('UPDATE networth SET month_over_month_change = ?, month_over_month_pct = ? WHERE month = ?').run(change, pct, row.month);
    }
    prev = row.total;
  }
}

// ─── Goals CRUD ────────────────────────────────────────────────────────────

export function getGoals() {
  return db.prepare('SELECT * FROM goals ORDER BY completed ASC, target_date ASC').all() as any[];
}

export function getGoalById(id: number) {
  return db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as any;
}

export function insertGoal(goal: {
  name: string;
  description?: string;
  target_amount: number;
  current_amount?: number;
  start_date: string;
  target_date: string;
  color?: string;
  icon?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO goals (name, description, target_amount, current_amount, start_date, target_date, color, icon, completed, updated_at)
    VALUES (@name, @description, @target_amount, @current_amount, @start_date, @target_date, @color, @icon, 0, CURRENT_TIMESTAMP)
  `);
  const result = stmt.run({
    name: goal.name,
    description: goal.description ?? '',
    target_amount: Number(goal.target_amount),
    current_amount: Number(goal.current_amount ?? 0),
    start_date: goal.start_date,
    target_date: goal.target_date,
    color: goal.color ?? '#6366f1',
    icon: goal.icon ?? 'savings',
  });
  return result.lastInsertRowid as number;
}

export function updateGoal(id: number, goal: Partial<{
  name: string;
  description: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  target_date: string;
  color: string;
  icon: string;
  completed: boolean;
}>) {
  const fields = Object.keys(goal).filter((k) => k !== 'id');
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
  const stmt = db.prepare(`UPDATE goals SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
  stmt.run({ ...goal, id });
}

export function deleteGoal(id: number) {
  db.prepare('DELETE FROM goals WHERE id = ?').run(id);
}

// ─── Analytics helpers ──────────────────────────────────────────────────────

export function getDailySpending(month: string) {
  return db.prepare(`
    SELECT
      SUBSTR(COALESCE(created_time, date), 1, 10) AS day,
      COUNT(*) AS tx_count,
      SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) AS paid_amount,
      SUM(amount) AS total_amount
    FROM transactions
    WHERE month = ?
    GROUP BY day
    ORDER BY day ASC
  `).all(month) as any[];
}

export function getDayOfWeekSpending() {
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
  `).all() as any[];
}

export function getTransactionStats(month: string) {
  const rows = db.prepare(`
    SELECT amount, category, title, type, done, COALESCE(created_time, date) AS tx_date
    FROM transactions WHERE month = ?
  `).all(month) as any[];

  if (rows.length === 0) {
    return {
      total: 0, count: 0, paid_count: 0, unpaid_count: 0,
      avg_amount: 0, median_amount: 0, min_amount: 0, max_amount: 0,
      largest_title: '', smallest_title: '',
      paid_amount: 0, unpaid_amount: 0,
    };
  }

  const paid = rows.filter((r) => r.done);
  const paidAmounts = paid.map((r) => r.amount).sort((a, b) => a - b);
  const allAmounts = rows.map((r) => r.amount).sort((a, b) => a - b);

  const median = (arr: number[]) => {
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
    largest_title: largest?.title ?? '',
    smallest_title: smallest?.title ?? '',
    paid_amount: paid.reduce((s, r) => s + r.amount, 0),
    unpaid_amount: rows.filter((r) => !r.done).reduce((s, r) => s + r.amount, 0),
  };
}

// ─── Forecast helpers ──────────────────────────────────────────────────────

export function getMonthlySpendingByCategory(month: string) {
  const rows = db.prepare(`
    SELECT category, type, SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) AS spent,
           SUM(amount) AS total_amount, COUNT(*) AS tx_count
    FROM transactions WHERE month = ?
    GROUP BY category, type
  `).all(month) as any[];
  return rows;
}

export function getCreditStatus(month: string) {
  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'credit_expense' AND done = 1 THEN amount ELSE 0 END) AS credit_expenses_paid,
      SUM(CASE WHEN type = 'credit_expense' THEN amount ELSE 0 END) AS credit_expenses_total,
      SUM(CASE WHEN type = 'credit_payment' AND done = 1 THEN amount ELSE 0 END) AS credit_payments_paid,
      SUM(CASE WHEN type = 'credit_payment' THEN amount ELSE 0 END) AS credit_payments_total
    FROM transactions WHERE month = ?
  `).get(month) as any;
  return row || { credit_expenses_paid: 0, credit_expenses_total: 0, credit_payments_paid: 0, credit_payments_total: 0 };
}

export function getRecentMonthlyTotals(limit = 6) {
  const months = db.prepare(`
    SELECT DISTINCT month, MIN(COALESCE(created_time, date)) AS month_start
    FROM transactions GROUP BY month ORDER BY MIN(COALESCE(created_time, date)) DESC LIMIT ?
  `).all(limit) as any[];

  const result = [];
  for (const { month, month_start } of months) {
    const row = db.prepare(`
      SELECT SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) AS total,
             MIN(COALESCE(created_time, date)) AS earliest,
             MAX(COALESCE(created_time, date)) AS latest
      FROM transactions WHERE month = ?
    `).get(month) as any;
    if (row && row.earliest) {
      const earliest = new Date(row.earliest);
      const latest = new Date(row.latest);
      const days = Math.max(1, Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      result.push({
        month,
        total: row.total || 0,
        days,
        daily_avg: (row.total || 0) / days,
        month_start,
      });
    }
  }
  return result.reverse(); // chronological order
}

export function getCumulativeDailySpending(month: string) {
  const daily = getDailySpending(month);
  let cumulative = 0;
  return daily.map((d: any) => {
    cumulative += d.paid_amount;
    return { day: d.day, amount: d.paid_amount, cumulative };
  });
}

export function getAllMonthsWithSpending() {
  return db.prepare(`
    SELECT month FROM transactions GROUP BY month ORDER BY MIN(COALESCE(created_time, date)) ASC
  `).all() as any[];
}

export function getSpendingVelocity(month: string) {
  // Get spending for current and previous months to compute velocity
  const months = db.prepare(`
    SELECT month FROM transactions GROUP BY month ORDER BY MIN(COALESCE(created_time, date)) DESC LIMIT 4
  `).all() as any[];

  const monthOrder = months.map((m) => m.month);
  const currentIdx = monthOrder.indexOf(month);

  const currentDaily = getDailySpending(month);
  const daysWithSpending = currentDaily.filter((d) => d.paid_amount > 0);

  // Compute average daily spend from history
  const allDays: { month: string; day: string; paid_amount: number }[] = [];
  for (const m of monthOrder) {
    const daily = getDailySpending(m);
    daily.forEach((d) => allDays.push({ month: m, day: d.day, paid_amount: d.paid_amount }));
  }

  const allSpendingDays = allDays.filter((d) => d.paid_amount > 0);
  const historicalAvgDaily = allSpendingDays.length > 0
    ? allSpendingDays.reduce((s, d) => s + d.paid_amount, 0) / allSpendingDays.length
    : 0;

  const currentAvgDaily = daysWithSpending.length > 0
    ? daysWithSpending.reduce((s, d) => s + d.paid_amount, 0) / daysWithSpending.length
    : 0;

  // Compute cumulative spending to detect velocity trend
  const cumulative = currentDaily.reduce((s, d) => s + d.paid_amount, 0);
  const totalDaysInPeriod = currentDaily.length || 1;

  return {
    current_avg_daily: currentAvgDaily,
    historical_avg_daily: historicalAvgDaily,
    days_with_spending: daysWithSpending.length,
    days_tracked: currentDaily.length,
    cumulative_spend: cumulative,
    projected_monthly: currentAvgDaily * 30, // rough projection
    velocity_vs_history: historicalAvgDaily > 0
      ? ((currentAvgDaily - historicalAvgDaily) / historicalAvgDaily) * 100
      : 0,
  };
}

export function getTitleSpending(month: string) {
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
    WHERE month = ?
    GROUP BY title
    ORDER BY SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) DESC
  `).all(month) as any[];
}

// ─── Investments CRUD ──────────────────────────────────────────────────────

export function getInvestments() {
  return db.prepare('SELECT * FROM investments ORDER BY type ASC, name ASC').all() as any[];
}

export function getInvestmentById(id: number) {
  return db.prepare('SELECT * FROM investments WHERE id = ?').get(id) as any;
}

export function insertInvestment(inv: {
  name: string;
  ticker?: string;
  type?: string;
  quantity?: number;
  avg_purchase_price?: number;
  current_price?: number;
  currency?: string;
  platform?: string;
  notes?: string;
  purchase_date?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO investments (name, ticker, type, quantity, avg_purchase_price, current_price, currency, platform, notes, purchase_date)
    VALUES (@name, @ticker, @type, @quantity, @avg_purchase_price, @current_price, @currency, @platform, @notes, @purchase_date)
  `);
  const result = stmt.run({
    name: inv.name,
    ticker: inv.ticker ?? '',
    type: inv.type ?? 'stock',
    quantity: Number(inv.quantity ?? 0),
    avg_purchase_price: Number(inv.avg_purchase_price ?? 0),
    current_price: Number(inv.current_price ?? 0),
    currency: inv.currency ?? 'IDR',
    platform: inv.platform ?? '',
    notes: inv.notes ?? '',
    purchase_date: inv.purchase_date ?? '',
  });
  return result.lastInsertRowid as number;
}

export function updateInvestment(id: number, inv: Partial<{
  name: string;
  ticker: string;
  type: string;
  quantity: number;
  avg_purchase_price: number;
  current_price: number;
  currency: string;
  platform: string;
  notes: string;
  purchase_date: string;
}>) {
  const fields = Object.keys(inv).filter((k) => k !== 'id');
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
  const stmt = db.prepare(`UPDATE investments SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
  stmt.run({ ...inv, id });
}

export function deleteInvestment(id: number) {
  db.prepare('DELETE FROM investments WHERE id = ?').run(id);
}

export function getPortfolioSummary() {
  const rows = db.prepare('SELECT * FROM investments').all() as any[];
  let totalInvested = 0;
  let totalCurrentValue = 0;
  const byType: Record<string, { invested: number; currentValue: number; count: number }> = {};

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
  const totalGainLossPct = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return {
    totalInvested,
    totalCurrentValue,
    totalGainLoss,
    totalGainLossPct,
    holdingsCount: rows.length,
    byType,
  };
}

// ─── Anomaly Detection ──────────────────────────────────────────────────────

export interface Anomaly {
  id: number;
  title: string;
  category: string;
  amount: number;
  type: string;
  created_time: string;
  reason: 'amount_spike' | 'new_merchant' | 'category_outlier';
  severity: 'high' | 'medium' | 'low';
  detail: string; // human-readable explanation
}

export function getAnomalies(month: string): Anomaly[] {
  // Get all paid transactions for the current month
  const currentTxs = db.prepare(`
    SELECT id, title, category, amount, type, created_time, done
    FROM transactions WHERE month = ? AND done = 1
  `).all(month) as any[];

  if (currentTxs.length === 0) return [];

  // Get all historical months (excluding current)
  const historicalMonths = db.prepare(`
    SELECT DISTINCT month FROM transactions WHERE month != ? ORDER BY month ASC
  `).all(month) as { month: string }[];

  // Get all historical paid transactions
  const allHistorical = historicalMonths.length > 0
    ? db.prepare(`
        SELECT id, title, category, amount, type, created_time
        FROM transactions WHERE month != ? AND done = 1
      `).all(month) as any[]
    : [];

  // Compute per-category stats (mean, stddev) from historical data
  const catStats: Record<string, { mean: number; stddev: number; amounts: number[] }> = {};
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
      catStats[cat].stddev = mean * 0.5; // fallback: 50% of mean
    }
  }

  // Set of all historical titles for "new merchant" detection
  const historicalTitles = new Set(allHistorical.map((tx) => tx.title.toLowerCase().trim()));

  const anomalies: Anomaly[] = [];

  for (const tx of currentTxs) {
    const stats = catStats[tx.category];

    // --- Amount spike detection ---
    if (stats && stats.amounts.length >= 2) {
      const threshold = stats.mean + 2.5 * stats.stddev;
      if (tx.amount > threshold && tx.amount > stats.mean * 1.5) {
        const zScore = stats.stddev > 0 ? ((tx.amount - stats.mean) / stats.stddev) : 0;
        anomalies.push({
          id: tx.id,
          title: tx.title,
          category: tx.category,
          amount: tx.amount,
          type: tx.type,
          created_time: tx.created_time,
          reason: 'amount_spike',
          severity: zScore > 4 ? 'high' : zScore > 3 ? 'medium' : 'low',
          detail: `${zScore.toFixed(1)}x above avg (avg ${formatIdrShort(stats.mean)}, this ${formatIdrShort(tx.amount)})`,
        });
        continue; // Don't double-flag
      }
    }

    // --- New merchant detection ---
    const titleKey = tx.title.toLowerCase().trim();
    if (!historicalTitles.has(titleKey) && historicalTitles.size > 0) {
      // Only flag if the amount is non-trivial (> 10k IDR)
      if (tx.amount > 10000) {
        anomalies.push({
          id: tx.id,
          title: tx.title,
          category: tx.category,
          amount: tx.amount,
          type: tx.type,
          created_time: tx.created_time,
          reason: 'new_merchant',
          severity: tx.amount > 500000 ? 'medium' : 'low',
          detail: `First time seeing "${tx.title}" — new spending pattern?`,
        });
      }
    }

    // --- Category outlier (category exists historically but never in this month range) ---
    // This is a softer signal — skip for now to avoid noise
  }

  return anomalies;
}

/** Internal helper for formatting amounts in anomaly detail strings */
function formatIdrShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return Math.round(n).toString();
}
