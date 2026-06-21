import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve('./data/financial.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

initSchema();

export function initSchema() {
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

  // Migrations for columns added after initial schema
  try { db.exec('ALTER TABLE transactions ADD COLUMN notes TEXT DEFAULT \'\''); } catch (_) { /* already exists */ }
}

// ─── Period helpers ─────────────────────────────────────────────────────────

export function getPeriodById(id: number) {
  return db.prepare('SELECT * FROM periods WHERE id = ?').get(id) as any;
}

export function getPeriodByMonth(month: string) {
  return db.prepare('SELECT * FROM periods WHERE month = ?').get(month) as any;
}

export function getAllPeriods() {
  return db.prepare('SELECT * FROM periods ORDER BY start_date ASC').all() as any[];
}

/** Get the active salary period (21st→20th cycle). Returns period row if it exists, null otherwise. */
export function getActivePeriod() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  const d = now.getDate();

  let periodMonth: number, periodYear: number;
  if (d >= 21) {
    // New period starts — named after NEXT month
    periodMonth = m + 1;
    periodYear = y;
    if (periodMonth > 12) { periodMonth = 1; periodYear = y + 1; }
  } else {
    periodMonth = m;
    periodYear = y;
  }

  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const monthStr = `${monthNames[periodMonth - 1]} ${periodYear}`;
  return db.prepare('SELECT * FROM periods WHERE month = ?').get(monthStr) as any;
}

/** Get active period ID. Returns null if period doesn't exist yet. */
export function getActivePeriodId(): number | null {
  const p = getActivePeriod();
  return p ? p.id : null;
}

/** Ensure a period row exists for the given month string. Returns the period id. */
export function ensurePeriod(month: string): number {
  let p = db.prepare('SELECT id FROM periods WHERE month = ?').get(month) as any;
  if (p) return p.id;

  // Compute dates from month name
  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  // Also handle alternate spellings
  const altNames: Record<string,string> = { 'Oktober': 'October' };

  const parts = month.split(' ');
  if (parts.length !== 2) throw new Error(`Cannot parse month: "${month}"`);
  let idx = monthNames.indexOf(parts[0]);
  if (idx === -1) idx = monthNames.indexOf(altNames[parts[0]] || '');
  if (idx === -1) throw new Error(`Unknown month name: "${parts[0]}"`);
  const year = parseInt(parts[1], 10);
  const m = idx + 1;

  const endDate = `${year}-${String(m).padStart(2,'0')}-20`;
  let prevM = m - 1, prevY = year;
  if (prevM === 0) { prevM = 12; prevY = year - 1; }
  const startDate = `${prevY}-${String(prevM).padStart(2,'0')}-21`;

  db.prepare('INSERT INTO periods (month, start_date, end_date) VALUES (?, ?, ?)').run(month, startDate, endDate);
  return (db.prepare('SELECT id FROM periods WHERE month = ?').get(month) as any).id;
}

// ─── Transactions CRUD ──────────────────────────────────────────────────────

export function getTransactions(filters?: { periodId?: number; type?: string; search?: string; category?: string }) {
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params: any[] = [];
  if (filters?.periodId) {
    sql += ' AND period_id = ?';
    params.push(filters.periodId);
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
    INSERT INTO transactions (period_id, date, title, category, amount, currency, type, payment_method, done, created_time, notes)
    VALUES (@period_id, @date, @title, @category, @amount, @currency, @type, @payment_method, @done, @created_time, @notes)
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

// ─── Networth CRUD ──────────────────────────────────────────────────────────

export function getNetworth() {
  const rows = db.prepare(`
    SELECT n.*, p.month, p.start_date, p.end_date
    FROM networth n JOIN periods p ON n.period_id = p.id
    ORDER BY p.start_date ASC
  `).all() as any[];
  for (const row of rows) {
    const breakdown = db.prepare('SELECT investment, value FROM networth_breakdown WHERE period_id = ?').all(row.period_id) as any[];
    row.breakdown = Object.fromEntries(breakdown.map((b) => [b.investment, b.value]));
  }
  return rows;
}

export function getNetworthByPeriod(periodId: number) {
  const row = db.prepare(`
    SELECT n.*, p.month, p.start_date, p.end_date
    FROM networth n JOIN periods p ON n.period_id = p.id
    WHERE n.period_id = ?
  `).get(periodId) as any;
  if (!row) return null;
  const breakdown = db.prepare('SELECT investment, value FROM networth_breakdown WHERE period_id = ?').all(periodId) as any[];
  row.breakdown = Object.fromEntries(breakdown.map((b) => [b.investment, b.value]));
  return row;
}

export function upsertNetworth(record: any) {
  const existing = db.prepare('SELECT period_id FROM networth WHERE period_id = ?').get(record.period_id);
  if (existing) {
    db.prepare(`
      UPDATE networth SET date = @date, total = @total, currency = @currency,
      month_over_month_change = @month_over_month_change, month_over_month_pct = @month_over_month_pct
      WHERE period_id = @period_id
    `).run(record);
    db.prepare('DELETE FROM networth_breakdown WHERE period_id = ?').run(record.period_id);
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
    insertBreakdown.run({ period_id: record.period_id, investment, value: value as number });
  }
}

export function deleteNetworth(periodId: number) {
  db.prepare('DELETE FROM networth WHERE period_id = ?').run(periodId);
}

// ─── Categories CRUD ───────────────────────────────────────────────────────

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

// ─── Monthly Summary ────────────────────────────────────────────────────────

export function getMonthlySummary() {
  // Iterate over periods that have transactions
  const periodRows = db.prepare(`
    SELECT DISTINCT p.id, p.month, p.start_date, p.end_date
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    ORDER BY p.start_date ASC
  `).all() as any[];

  const summaries = [];
  for (const p of periodRows) {
    const tx = db.prepare('SELECT * FROM transactions WHERE period_id = ? AND done = 1').all(p.id) as any[];
    const cash = tx.filter((t) => t.type === 'cash').reduce((s, t) => s + t.amount, 0);
    const credit_payment = tx.filter((t) => t.type === 'credit_payment').reduce((s, t) => s + t.amount, 0);
    const credit_expenses = tx.filter((t) => t.type === 'credit_expense').reduce((s, t) => s + t.amount, 0);
    const total_outcome = cash + credit_payment;

    const nw = db.prepare('SELECT total FROM networth WHERE period_id = ?').get(p.id) as any;

    const category_totals: Record<string, number> = {};
    tx.filter((t) => t.type === 'cash' || t.type === 'credit_expense' || t.type === 'credit_payment').forEach((t) => {
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
      category_totals,
    });
  }
  return summaries;
}

// ─── Monthly Income CRUD ────────────────────────────────────────────────────

export function getMonthlyIncome() {
  return db.prepare(`
    SELECT mi.*, p.month, p.start_date, p.end_date
    FROM monthly_income mi JOIN periods p ON mi.period_id = p.id
    ORDER BY p.start_date ASC
  `).all() as any[];
}

export function getMonthlyIncomeByPeriod(periodId: number) {
  return db.prepare(`
    SELECT mi.*, p.month, p.start_date, p.end_date
    FROM monthly_income mi JOIN periods p ON mi.period_id = p.id
    WHERE mi.period_id = ?
  `).get(periodId) as any;
}

export function upsertMonthlyIncome(record: { period_id: number; date: string; income: number; other_income?: number }) {
  const existing = db.prepare('SELECT period_id FROM monthly_income WHERE period_id = ?').get(record.period_id);
  if (existing) {
    db.prepare(`
      UPDATE monthly_income SET date = @date, income = @income, other_income = @other_income WHERE period_id = @period_id
    `).run({
      period_id: record.period_id,
      date: record.date,
      income: record.income,
      other_income: record.other_income ?? 0,
    });
  } else {
    db.prepare(`
      INSERT INTO monthly_income (period_id, date, income, other_income)
      VALUES (@period_id, @date, @income, @other_income)
    `).run({
      period_id: record.period_id,
      date: record.date,
      income: record.income,
      other_income: record.other_income ?? 0,
    });
  }
}

export function deleteMonthlyIncome(periodId: number) {
  db.prepare('DELETE FROM monthly_income WHERE period_id = ?').run(periodId);
}

// ─── Recurring Transactions ─────────────────────────────────────────────────

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

// ─── Networth MoM ───────────────────────────────────────────────────────────

export function recalcNetworthMoM() {
  const rows = db.prepare(`
    SELECT n.period_id, n.total, p.start_date
    FROM networth n JOIN periods p ON n.period_id = p.id
    ORDER BY p.start_date ASC
  `).all() as any[];
  let prev: number | null = null;
  for (const row of rows) {
    if (prev === null) {
      db.prepare('UPDATE networth SET month_over_month_change = NULL, month_over_month_pct = NULL WHERE period_id = ?').run(row.period_id);
    } else {
      const change = Number((row.total - prev).toFixed(2));
      const pct = prev > 0 ? Number(((row.total - prev) / prev * 100).toFixed(2)) : null;
      db.prepare('UPDATE networth SET month_over_month_change = ?, month_over_month_pct = ? WHERE period_id = ?').run(change, pct, row.period_id);
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

export function getDailySpending(periodId: number) {
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
  `).all(periodId) as any[];
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

export function getTransactionStats(periodId: number) {
  const rows = db.prepare(`
    SELECT amount, category, title, type, done, COALESCE(created_time, date) AS tx_date
    FROM transactions WHERE period_id = ?
  `).all(periodId) as any[];

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

export function getMonthlySpendingByCategory(periodId: number) {
  const rows = db.prepare(`
    SELECT category, type, SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) AS spent,
           SUM(amount) AS total_amount, COUNT(*) AS tx_count
    FROM transactions WHERE period_id = ?
    GROUP BY category, type
  `).all(periodId) as any[];
  return rows;
}

export function getCreditStatus(periodId: number) {
  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'credit_expense' AND done = 1 THEN amount ELSE 0 END) AS credit_expenses_paid,
      SUM(CASE WHEN type = 'credit_expense' THEN amount ELSE 0 END) AS credit_expenses_total,
      SUM(CASE WHEN type = 'credit_payment' AND done = 1 THEN amount ELSE 0 END) AS credit_payments_paid,
      SUM(CASE WHEN type = 'credit_payment' THEN amount ELSE 0 END) AS credit_payments_total
    FROM transactions WHERE period_id = ?
  `).get(periodId) as any;
  return row || { credit_expenses_paid: 0, credit_expenses_total: 0, credit_payments_paid: 0, credit_payments_total: 0 };
}

export function getRecentMonthlyTotals(limit = 6) {
  const periodRows = db.prepare(`
    SELECT DISTINCT p.id, p.month, p.start_date, MIN(t.created_time) AS first_tx
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    GROUP BY p.id
    ORDER BY p.start_date DESC LIMIT ?
  `).all(limit) as any[];

  const result = [];
  for (const p of periodRows) {
    const row = db.prepare(`
      SELECT SUM(CASE WHEN done = 1 THEN amount ELSE 0 END) AS total,
             MIN(COALESCE(created_time, date)) AS earliest,
             MAX(COALESCE(created_time, date)) AS latest
      FROM transactions WHERE period_id = ?
    `).get(p.id) as any;
    if (row && row.earliest) {
      const earliest = new Date(row.earliest);
      const latest = new Date(row.latest);
      const days = Math.max(1, Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      result.push({
        period_id: p.id,
        month: p.month,
        total: row.total || 0,
        days,
        daily_avg: (row.total || 0) / days,
        month_start: p.start_date,
      });
    }
  }
  return result.reverse(); // chronological order
}

export function getCumulativeDailySpending(periodId: number) {
  const daily = getDailySpending(periodId);
  let cumulative = 0;
  return daily.map((d: any) => {
    cumulative += d.paid_amount;
    return { day: d.day, amount: d.paid_amount, cumulative };
  });
}

export function getAllMonthsWithSpending() {
  return db.prepare(`
    SELECT p.id AS period_id, p.month, p.start_date, p.end_date
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    GROUP BY p.id
    ORDER BY p.start_date ASC
  `).all() as any[];
}

export function getSpendingVelocity(periodId: number) {
  // Get spending for current and previous periods to compute velocity
  const periodRows = db.prepare(`
    SELECT DISTINCT p.id, p.month, p.start_date
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    GROUP BY p.id
    ORDER BY p.start_date DESC LIMIT 4
  `).all() as any[];

  const periodIds = periodRows.map((p) => p.id);
  const currentIdx = periodIds.indexOf(periodId);

  const currentDaily = getDailySpending(periodId);
  const daysWithSpending = currentDaily.filter((d) => d.paid_amount > 0);

  // Compute average daily spend from history
  const allDays: { period_id: number; day: string; paid_amount: number }[] = [];
  for (const pid of periodIds) {
    const daily = getDailySpending(pid);
    daily.forEach((d) => allDays.push({ period_id: pid, day: d.day, paid_amount: d.paid_amount }));
  }

  const allSpendingDays = allDays.filter((d) => d.paid_amount > 0);
  const historicalAvgDaily = allSpendingDays.length > 0
    ? allSpendingDays.reduce((s, d) => s + d.paid_amount, 0) / allSpendingDays.length
    : 0;

  const currentAvgDaily = daysWithSpending.length > 0
    ? daysWithSpending.reduce((s, d) => s + d.paid_amount, 0) / daysWithSpending.length
    : 0;

  const cumulative = currentDaily.reduce((s, d) => s + d.paid_amount, 0);
  const totalDaysInPeriod = currentDaily.length || 1;

  return {
    current_avg_daily: currentAvgDaily,
    historical_avg_daily: historicalAvgDaily,
    days_with_spending: daysWithSpending.length,
    days_tracked: currentDaily.length,
    cumulative_spend: cumulative,
    projected_monthly: currentAvgDaily * 30,
    velocity_vs_history: historicalAvgDaily > 0
      ? ((currentAvgDaily - historicalAvgDaily) / historicalAvgDaily) * 100
      : 0,
  };
}

export function getTitleSpending(periodId: number) {
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
  `).all(periodId) as any[];
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
  detail: string;
}

export function getAnomalies(periodId: number): Anomaly[] {
  const currentTxs = db.prepare(`
    SELECT id, title, category, amount, type, created_time, done
    FROM transactions WHERE period_id = ? AND done = 1
  `).all(periodId) as any[];

  if (currentTxs.length === 0) return [];

  // Get all historical periods (excluding current)
  const historicalPeriods = db.prepare(`
    SELECT DISTINCT p.id
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    WHERE p.id != ?
    ORDER BY p.start_date ASC
  `).all(periodId) as { id: number }[];

  const histIds = historicalPeriods.map((p) => p.id);

  const allHistorical = histIds.length > 0
    ? db.prepare(`
        SELECT id, title, category, amount, type, created_time
        FROM transactions WHERE period_id IN (${histIds.map(() => '?').join(',')}) AND done = 1
      `).all(...histIds) as any[]
    : [];

  // Compute per-category stats
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
      catStats[cat].stddev = mean * 0.5;
    }
  }

  const historicalTitles = new Set(allHistorical.map((tx) => tx.title.toLowerCase().trim()));
  const anomalies: Anomaly[] = [];

  for (const tx of currentTxs) {
    const stats = catStats[tx.category];

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
        continue;
      }
    }

    const titleKey = tx.title.toLowerCase().trim();
    if (!historicalTitles.has(titleKey) && historicalTitles.size > 0) {
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
  }

  return anomalies;
}

function formatIdrShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return Math.round(n).toString();
}

// ─── Budget Recommendations Engine ──────────────────────────────────────────

export interface CategoryStat {
  categoryId: number;
  category: string;
  periodCount: number;
  totalSpent: number;
  avgSpent: number;
  medianSpent: number;
  p80Spent: number;
  maxSpent: number;
  minSpent: number;
  stdDev: number;
  trend: 'rising' | 'falling' | 'stable';
  trendPct: number;       // estimated % change per period
  volatility: 'low' | 'medium' | 'high';
  currentLimit: number;   // existing monthly_limit or 0
  recommendedLimit: number;
  confidence: 'high' | 'medium' | 'low'; // based on data points
}

/** Compute category-level statistics across ALL periods for budget recommendations */
export function getCategoryStats(): CategoryStat[] {
  // Get per-period spending by category
  const rows = db.prepare(`
    SELECT t.period_id, t.category, SUM(t.amount) as spent
    FROM transactions t
    WHERE t.done = 1
      AND t.type IN ('cash', 'credit_expense')
    GROUP BY t.period_id, t.category
    ORDER BY t.category, t.period_id
  `).all() as { period_id: number; category: string; spent: number }[];

  // Group by category
  const byCategory: Record<string, number[]> = {};
  for (const row of rows) {
    if (!byCategory[row.category]) byCategory[row.category] = [];
    byCategory[row.category].push(row.spent);
  }

  // Get existing limits
  const catRows = db.prepare('SELECT id, name, monthly_limit FROM categories').all() as { id: number; name: string; monthly_limit: number }[];
  const limitMap = new Map(catRows.map((c) => [c.name, c.monthly_limit ?? 0]));
  const idMap = new Map(catRows.map((c) => [c.name, c.id]));

  const stats: CategoryStat[] = [];

  for (const [category, values] of Object.entries(byCategory)) {
    if (values.length < 1) continue;

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const total = sorted.reduce((s, v) => s + v, 0);
    const avg = total / n;

    // Median
    const mid = Math.floor(n / 2);
    const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    // 80th percentile
    const p80Idx = Math.ceil(n * 0.8) - 1;
    const p80 = sorted[Math.min(p80Idx, n - 1)];

    // Standard deviation
    const variance = sorted.reduce((s, v) => s + (v - avg) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);

    // Trend: linear regression across periods (simple slope estimate)
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    let trendPct = 0;
    if (n >= 3 && avg > 0) {
      // Compare first half vs second half average
      const half = Math.floor(n / 2);
      const firstHalf = sorted.slice(0, half);
      const secondHalf = sorted.slice(n - half);
      const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
      if (firstAvg > 0) {
        trendPct = ((secondAvg - firstAvg) / firstAvg) * 100;
        if (trendPct > 10) trend = 'rising';
        else if (trendPct < -10) trend = 'falling';
        else trend = 'stable';
      }
    }

    // Volatility
    let volatility: 'low' | 'medium' | 'high' = 'medium';
    if (avg > 0) {
      const cv = stdDev / avg; // coefficient of variation
      if (cv < 0.25) volatility = 'low';
      else if (cv > 0.5) volatility = 'high';
    }

    // Confidence
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (n >= 12) confidence = 'high';
    else if (n >= 6) confidence = 'medium';

    // Recommended limit: weighted blend of 80th percentile and average
    // For stable/low-volatility categories, lean toward p80; for volatile, lean toward avg
    const recommendedLimit = volatility === 'high'
      ? Math.round(avg * 1.1)  // volatile: add 10% buffer to average
      : Math.round(p80 * 0.95); // stable: 95% of p80 (slight stretch)

    stats.push({
      categoryId: idMap.get(category) ?? 0,
      category,
      periodCount: n,
      totalSpent: total,
      avgSpent: Math.round(avg),
      medianSpent: Math.round(median),
      p80Spent: Math.round(p80),
      maxSpent: Math.round(sorted[n - 1]),
      minSpent: Math.round(sorted[0]),
      stdDev: Math.round(stdDev),
      trend,
      trendPct: Math.round(trendPct * 10) / 10,
      volatility,
      currentLimit: limitMap.get(category) ?? 0,
      recommendedLimit,
      confidence,
    });
  }

  // Sort by total spent descending
  stats.sort((a, b) => b.totalSpent - a.totalSpent);

  return stats;
}

// ─── Recurring vs Discretionary Breakdown ────────────────────────────────────

export interface RecurringBreakdownPeriod {
  period_id: number;
  month: string;
  recurring: number;
  discretionary: number;
  total: number;
  recurring_pct: number;
  discretionary_pct: number;
  recurring_count: number;
  discretionary_count: number;
}

export interface RecurringBreakdownTopItem {
  title: string;
  category: string;
  amount: number;
}

export interface RecurringBreakdown {
  periods: RecurringBreakdownPeriod[];
  current: RecurringBreakdownPeriod | null;
  topRecurring: RecurringBreakdownTopItem[];
}

export function getRecurringVsDiscretionary(periodId?: number): RecurringBreakdown {
  // Get all active recurring transaction titles (lowercased for matching)
  const recurringTitles = db.prepare(
    "SELECT LOWER(title) as title, title as original_title, category, amount FROM recurring_transactions WHERE active = 1"
  ).all() as { title: string; original_title: string; category: string; amount: number }[];

  const recurringTitleSet = new Set(recurringTitles.map((r) => r.title));

  // Build a map for top recurring items (use the latest period's data)
  const recurringAmountMap = new Map<string, number>();
  for (const r of recurringTitles) {
    recurringAmountMap.set(r.title, r.amount);
  }

  // Get all periods with transactions
  const periodRows = db.prepare(`
    SELECT DISTINCT p.id, p.month, p.start_date
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    WHERE t.done = 1 AND t.type IN ('cash', 'credit_expense')
    ORDER BY p.start_date ASC
  `).all() as { id: number; month: string; start_date: string }[];

  // If a specific period is requested, filter
  const targetPeriods = periodId
    ? periodRows.filter((p) => p.id === periodId)
    : periodRows;

  const periods: RecurringBreakdownPeriod[] = [];

  for (const p of targetPeriods) {
    const txs = db.prepare(`
      SELECT title, category, amount FROM transactions
      WHERE period_id = ? AND done = 1 AND type IN ('cash', 'credit_expense')
    `).all(p.id) as { title: string; category: string; amount: number }[];

    let recurring = 0;
    let discretionary = 0;
    let recurring_count = 0;
    let discretionary_count = 0;

    for (const tx of txs) {
      const titleLower = tx.title.toLowerCase();
      // Check if this transaction matches a recurring template
      // Use fuzzy matching: exact match or the recurring title is contained in the transaction title
      const isRecurring = recurringTitleSet.has(titleLower) ||
        [...recurringTitleSet].some((rt) => titleLower.includes(rt) || rt.includes(titleLower));

      if (isRecurring) {
        recurring += tx.amount;
        recurring_count++;
      } else {
        discretionary += tx.amount;
        discretionary_count++;
      }
    }

    const total = recurring + discretionary;
    periods.push({
      period_id: p.id,
      month: p.month,
      recurring: Math.round(recurring * 100) / 100,
      discretionary: Math.round(discretionary * 100) / 100,
      total: Math.round(total * 100) / 100,
      recurring_pct: total > 0 ? Math.round((recurring / total) * 1000) / 10 : 0,
      discretionary_pct: total > 0 ? Math.round((discretionary / total) * 1000) / 10 : 0,
      recurring_count,
      discretionary_count,
    });
  }

  // Current period = last in the list
  const current = periods.length > 0 ? periods[periods.length - 1] : null;

  // Top recurring items: aggregate across all periods
  const recurringTotals = new Map<string, { title: string; category: string; amount: number }>();
  for (const p of periodRows) {
    const txs = db.prepare(`
      SELECT title, category, amount FROM transactions
      WHERE period_id = ? AND done = 1 AND type IN ('cash', 'credit_expense')
    `).all(p.id) as { title: string; category: string; amount: number }[];

    for (const tx of txs) {
      const titleLower = tx.title.toLowerCase();
      const isRecurring = recurringTitleSet.has(titleLower) ||
        [...recurringTitleSet].some((rt) => titleLower.includes(rt) || rt.includes(titleLower));

      if (isRecurring) {
        const key = tx.title;
        const existing = recurringTotals.get(key);
        if (existing) {
          existing.amount += tx.amount;
        } else {
          recurringTotals.set(key, { title: tx.title, category: tx.category, amount: tx.amount });
        }
      }
    }
  }

  const topRecurring = [...recurringTotals.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      amount: Math.round(item.amount * 100) / 100,
    }));

  return { periods, current, topRecurring };
}
