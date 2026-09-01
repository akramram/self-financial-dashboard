import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
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
      end_date TEXT,
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
  try { db.exec(`ALTER TABLE transactions ADD COLUMN notes TEXT DEFAULT ''`); } catch (_) { /* already exists */ }
  try { db.exec('ALTER TABLE recurring_transactions ADD COLUMN end_date TEXT'); } catch (_) { /* already exists */ }
  try { db.exec('ALTER TABLE recurring_transactions ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP'); } catch (_) { /* already exists */ }

  // Auth tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin', 'viewer')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  // Seed default users (only if no users exist)
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const adminHash = bcrypt.hashSync('Deimon98', 10);
    const viewerHash = bcrypt.hashSync('viewer', 10);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('chowderlatte', adminHash, 'admin');
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('viewer', viewerHash, 'viewer');
  }
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

/** All transactions whose created_time (or date fallback) falls on the given YYYY-MM-DD day. */
export function getTransactionsByDate(day: string) {
  return db.prepare(`
    SELECT * FROM transactions
    WHERE SUBSTR(COALESCE(created_time, date), 1, 10) = ?
    ORDER BY created_time DESC
  `).all(day) as any[];
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
  const fields = Object.keys(normalized).filter((k) => k !== 'id');
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
  const fields = Object.keys(normalized).filter((k) => k !== 'id');
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
  const safeRecord = {
    period_id: record.period_id,
    date: record.date,
    total: record.total,
    currency: record.currency || 'IDR',
    month_over_month_change: record.month_over_month_change ?? null,
    month_over_month_pct: record.month_over_month_pct ?? null,
  };
  const existing = db.prepare('SELECT period_id FROM networth WHERE period_id = ?').get(record.period_id);
  if (existing) {
    db.prepare(`
      UPDATE networth SET date = @date, total = @total, currency = @currency,
      month_over_month_change = @month_over_month_change, month_over_month_pct = @month_over_month_pct
      WHERE period_id = @period_id
    `).run(safeRecord);
    db.prepare('DELETE FROM networth_breakdown WHERE period_id = ?').run(record.period_id);
  } else {
    db.prepare(`
      INSERT INTO networth (period_id, date, total, currency, month_over_month_change, month_over_month_pct)
      VALUES (@period_id, @date, @total, @currency, @month_over_month_change, @month_over_month_pct)
    `).run(safeRecord);
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

/**
 * Count active alerts for the current period — anomaly alerts (server-side
 * detection) + budget "over limit" alerts. Used by Layout to badge the bell.
 * Mirrors AlertsPanel logic: over-budget always counts; "approaching" (80-99%)
 * is skipped when all category spend comes from recurring transactions.
 * ponytail: ignores per-user localStorage dismissals (server can't see them);
 * upgrade to an API + client count if that mismatch bothers anyone.
 */
export function getActiveAlertCount(): number {
  try {
    const periodId = getActivePeriodId();
    if (periodId == null) return 0;

    let count = getAnomalies(periodId).length;

    const rows = db.prepare(`
      SELECT t.category AS cat, SUM(t.amount) AS total
      FROM transactions t
      WHERE t.period_id = ? AND t.done = 1
        AND t.type IN ('cash', 'credit_expense')
      GROUP BY t.category
    `).all(periodId) as { cat: string; total: number }[];

    if (rows.length > 0) {
      const limits: Record<string, number> = {};
      for (const c of getCategories() as any[]) {
        if (c.monthly_limit > 0) limits[c.name] = c.monthly_limit;
      }
      for (const r of rows) {
        const limit = limits[r.cat];
        if (limit && r.total > limit) count++;
      }
    }

    return count;
  } catch {
    return 0;
  }
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
    INSERT INTO recurring_transactions (title, category, amount, type, payment_method, done, active, end_date, created_at)
    VALUES (@title, @category, @amount, @type, @payment_method, @done, @active, @end_date, @created_at)
  `);
  const result = stmt.run({
    title: tx.title,
    category: tx.category,
    amount: Number(tx.amount),
    type: tx.type,
    payment_method: tx.payment_method || 'Cash',
    done: tx.done ? 1 : 0,
    active: tx.active !== false ? 1 : 0,
    end_date: tx.end_date || null,
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

// ============================================================
// Spending Streaks — gamify no-spend days
// "No-spend day" = a calendar day with zero discretionary spending
//   (discretionary = cash or credit_expense, excludes credit_payment
//    which is just moving money between accounts, not real spending)
// ============================================================

export interface StreakDay {
  date: string;          // YYYY-MM-DD
  dow: number;           // 0=Sun .. 6=Sat
  isNoSpend: boolean;
  txCount: number;
  total: number;
}

export interface DayOfWeekPattern {
  dow: number;           // 0=Sun .. 6=Sat
  label: string;
  spendDays: number;     // distinct days with spending on this weekday
  noSpendDays: number;   // distinct no-spend days on this weekday
  totalSpend: number;
  avgPerSpendDay: number;
}

export interface StreakBadge {
  id: string;
  label: string;
  description: string;
  icon: string;          // emoji
  unlocked: boolean;
  progress?: { current: number; target: number };
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  todayIsNoSpend: boolean;
  yesterdayWasNoSpend: boolean;
  noSpendLast30: number;
  noSpendLast90: number;
  totalDaysTracked: number;
  firstTrackedDate: string | null;
  recentDays: StreakDay[];           // last 35 days, oldest→newest, for the strip
  dowPattern: DayOfWeekPattern[];    // 7 entries
  badges: StreakBadge[];
  // recent no-spend days with a transaction drilldown (newest first)
  recentNoSpendDays: string[];
}

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getSpendingStreaks(): StreakResult {
  // 1. Pull every distinct discretionary spend day (all-time), with totals.
  //    created_time is the real per-day timestamp; date is just a period marker.
  const spendDayRows = db.prepare(`
    SELECT DATE(created_time) AS day,
           COUNT(*) AS tx_count,
           SUM(amount) AS total
    FROM transactions
    WHERE type IN ('cash', 'credit_expense')
      AND done = 1
      AND created_time IS NOT NULL
      AND DATE(created_time) <= DATE('now')
    GROUP BY day
  `).all() as { day: string; tx_count: number; total: number }[];

  const spendDaySet = new Set(spendDayRows.map((r) => r.day));
  const spendDayMap = new Map(spendDayRows.map((r) => [r.day, r]));

  // 2. Determine the tracking window: from the earliest discretionary
  //    transaction date through today.
  const today = new Date();
  const todayStr = ymd(today);

  let firstTrackedDate: string | null = null;
  if (spendDayRows.length > 0) {
    const sorted = spendDayRows.map((r) => r.day).sort();
    // Start tracking the day BEFORE the first spend, so the first no-spend
    // streak can include that boundary if it was genuinely no-spend.
    firstTrackedDate = sorted[0];
  }

  // 3. Build a per-day map for the last 120 days (enough for 90-day stats + strip).
  //    We walk day-by-day from today backwards so no-spend gaps are explicit.
  const lookbackDays = 120;
  const stripDays: StreakDay[] = [];
  let noSpendLast30 = 0;
  let noSpendLast90 = 0;
  const windowStart90 = new Date(today);
  windowStart90.setDate(windowStart90.getDate() - 89); // inclusive 90 days
  const windowStart30 = new Date(today);
  windowStart30.setDate(windowStart30.getDate() - 29); // inclusive 30 days

  for (let i = lookbackDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = ymd(d);
    const spend = spendDayMap.get(ds);
    const isNoSpend = !spend; // no discretionary spend that day
    const dow = (d.getDay() + 7) % 7; // 0=Sun..6=Sat (JS already uses this)
    const day: StreakDay = {
      date: ds,
      dow,
      isNoSpend,
      txCount: spend?.tx_count ?? 0,
      total: spend?.total ?? 0,
    };
    stripDays.push(day);
    if (isNoSpend) {
      if (d >= windowStart30 && d <= today) noSpendLast30++;
      if (d >= windowStart90 && d <= today) noSpendLast90++;
    }
  }

  // 4. Current streak — consecutive no-spend days ending today OR yesterday.
  //    (If today already has spending, the streak is held by yesterday's run,
  //     giving the user the rest of today to extend it.)
  const todayIsNoSpend = !spendDaySet.has(todayStr);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = ymd(yesterday);
  const yesterdayWasNoSpend = !spendDaySet.has(yesterdayStr);

  const streakAnchor = todayIsNoSpend
    ? new Date(today)
    : yesterdayWasNoSpend
      ? new Date(yesterday)
      : null;

  let currentStreak = 0;
  if (streakAnchor) {
    const cursor = new Date(streakAnchor);
    while (!spendDaySet.has(ymd(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // 5. Longest streak — walk all tracked days from firstTrackedDate→today,
  //    counting maximal runs of no-spend days.
  let longestStreak = 0;
  let run = 0;
  if (firstTrackedDate) {
    const start = new Date(firstTrackedDate + 'T00:00:00');
    const end = new Date(todayStr + 'T00:00:00');
    // Cap at 3 years of day-walking to stay cheap.
    const guard = new Date(start);
    guard.setFullYear(guard.getFullYear() + 3);
    const hardEnd = end < guard ? end : guard;
    const cursor = new Date(start);
    while (cursor <= hardEnd) {
      if (!spendDaySet.has(ymd(cursor))) {
        run++;
        if (run > longestStreak) longestStreak = run;
      } else {
        run = 0;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // 6. Day-of-week pattern — from the last 90 days strip.
  const dowAgg: Record<number, { spendDays: number; noSpendDays: number; totalSpend: number }> = {};
  for (let i = 0; i < 7; i++) dowAgg[i] = { spendDays: 0, noSpendDays: 0, totalSpend: 0 };
  for (const d of stripDays) {
    const dt = new Date(d.date + 'T00:00:00');
    if (dt >= windowStart90 && dt <= today) {
      if (d.isNoSpend) dowAgg[d.dow].noSpendDays++;
      else {
        dowAgg[d.dow].spendDays++;
        dowAgg[d.dow].totalSpend += d.total;
      }
    }
  }
  const dowPattern: DayOfWeekPattern[] = [];
  for (let i = 0; i < 7; i++) {
    const a = dowAgg[i];
    dowPattern.push({
      dow: i,
      label: DOW_LABELS[i],
      spendDays: a.spendDays,
      noSpendDays: a.noSpendDays,
      totalSpend: a.totalSpend,
      avgPerSpendDay: a.spendDays > 0 ? Math.round(a.totalSpend / a.spendDays) : 0,
    });
  }

  // 7. Badges
  const badges: StreakBadge[] = [
    { id: 'first-step', label: 'First Step', description: '1 no-spend day', icon: '🌱',
      unlocked: longestStreak >= 1 || currentStreak >= 1 },
    { id: 'three-peat', label: 'Three-peat', description: '3-day streak', icon: '🔥',
      unlocked: longestStreak >= 3,
      progress: { current: Math.min(longestStreak, 3), target: 3 } },
    { id: 'week-warrior', label: 'Week Warrior', description: '7-day streak', icon: '⚡',
      unlocked: longestStreak >= 7,
      progress: { current: Math.min(longestStreak, 7), target: 7 } },
    { id: 'fortnight', label: 'Fortnight', description: '14-day streak', icon: '🏆',
      unlocked: longestStreak >= 14,
      progress: { current: Math.min(longestStreak, 14), target: 14 } },
    { id: 'month-master', label: 'Month Master', description: '30-day streak', icon: '👑',
      unlocked: longestStreak >= 30,
      progress: { current: Math.min(longestStreak, 30), target: 30 } },
    { id: 'consistent-30', label: 'Consistent', description: '10+ no-spend days in last 30', icon: '📅',
      unlocked: noSpendLast30 >= 10,
      progress: { current: Math.min(noSpendLast30, 10), target: 10 } },
    { id: 'on-fire', label: 'On Fire', description: 'Current streak ≥ 3 days', icon: '🚀',
      unlocked: currentStreak >= 3,
      progress: { current: Math.min(currentStreak, 3), target: 3 } },
  ];

  // 8. Recent no-spend days (last 30, newest first) for drilldown list
  const recentNoSpendDays = stripDays
    .filter((d) => d.isNoSpend && new Date(d.date + 'T00:00:00') >= windowStart30)
    .map((d) => d.date)
    .reverse();

  // Total tracked days = days between firstTrackedDate and today (inclusive)
  let totalDaysTracked = 0;
  if (firstTrackedDate) {
    const ms = today.getTime() - new Date(firstTrackedDate + 'T00:00:00').getTime();
    totalDaysTracked = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
  }

  return {
    currentStreak,
    longestStreak,
    todayIsNoSpend,
    yesterdayWasNoSpend,
    noSpendLast30,
    noSpendLast90,
    totalDaysTracked,
    firstTrackedDate,
    recentDays: stripDays.slice(-35),
    dowPattern,
    badges,
    recentNoSpendDays,
  };
}

/** Format a Date as YYYY-MM-DD in local time (avoids UTC off-by-one). */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

// ─── Category × Period Spending Matrix ──────────────────────────────────────

export interface CategoryPeriodCell {
  amount: number;
  tx_count: number;
}

export interface CategoryPeriodMatrixRow {
  category: string;
  /** keyed by period_id */
  cells: Record<number, CategoryPeriodCell>;
  total: number;
  avg: number;
  periodCount: number;   // how many periods had any spend
  max: number;           // peak spend across periods
  maxPeriodId: number | null;
  trendPct: number | null;  // % change comparing last half vs first half
}

export interface CategoryPeriodMatrix {
  periods: { id: number; month: string; start_date: string; end_date: string }[];
  categories: CategoryPeriodMatrixRow[];
  /** period_id → total spend across categories (for column comparison) */
  periodTotals: Record<number, number>;
}

/**
 * Returns a category × period spending matrix.
 * Each cell contains the total paid spend for a (category, period) pair.
 * Categories are sorted by total spend descending.
 * Periods are ordered chronologically.
 */
export function getCategoryPeriodMatrix(): CategoryPeriodMatrix {
  // Get all periods that have paid spending transactions
  const periods = db.prepare(`
    SELECT DISTINCT p.id, p.month, p.start_date, p.end_date
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    WHERE t.done = 1 AND t.type IN ('cash', 'credit_expense')
    ORDER BY p.start_date ASC
  `).all() as { id: number; month: string; start_date: string; end_date: string }[];

  if (periods.length === 0) {
    return { periods: [], categories: [], periodTotals: {} };
  }

  const periodIds = periods.map((p) => p.id);

  // Aggregate spend per (category, period)
  const rows = db.prepare(`
    SELECT category, period_id, SUM(amount) AS amount, COUNT(*) AS tx_count
    FROM transactions
    WHERE done = 1 AND type IN ('cash', 'credit_expense')
      AND period_id IN (${periodIds.map(() => '?').join(',')})
    GROUP BY category, period_id
  `).all(...periodIds) as { category: string; period_id: number; amount: number; tx_count: number }[];

  // Build a nested map: category → period_id → { amount, tx_count }
  const byCategory = new Map<string, Map<number, CategoryPeriodCell>>();
  const periodTotals: Record<number, number> = {};
  for (const pid of periodIds) periodTotals[pid] = 0;

  for (const row of rows) {
    if (!byCategory.has(row.category)) byCategory.set(row.category, new Map());
    byCategory.get(row.category)!.set(row.period_id, {
      amount: Math.round(row.amount * 100) / 100,
      tx_count: row.tx_count,
    });
    periodTotals[row.period_id] += row.amount;
  }
  for (const pid of periodIds) {
    periodTotals[pid] = Math.round(periodTotals[pid] * 100) / 100;
  }

  // Build matrix rows with stats
  const matrixRows: CategoryPeriodMatrixRow[] = [];
  for (const [category, cellMap] of byCategory.entries()) {
    const values: number[] = [];
    let total = 0;
    let max = 0;
    let maxPeriodId: number | null = null;

    for (const pid of periodIds) {
      const cell = cellMap.get(pid);
      const amt = cell?.amount ?? 0;
      values.push(amt);
      total += amt;
      if (amt > max) {
        max = amt;
        maxPeriodId = pid;
      }
    }

    const periodCount = values.filter((v) => v > 0).length;
    const avg = periodCount > 0 ? total / periodCount : 0;

    // Trend: compare first half vs second half average
    let trendPct: number | null = null;
    if (values.length >= 3) {
      const half = Math.floor(values.length / 2);
      const firstSlice = values.slice(0, half);
      const secondSlice = values.slice(values.length - half);
      const firstAvg = firstSlice.reduce((s, v) => s + v, 0) / Math.max(1, firstSlice.length);
      const secondAvg = secondSlice.reduce((s, v) => s + v, 0) / Math.max(1, secondSlice.length);
      if (firstAvg > 0) {
        trendPct = Math.round(((secondAvg - firstAvg) / firstAvg) * 1000) / 10;
      }
    }

    const cells: Record<number, CategoryPeriodCell> = {};
    for (const [pid, cell] of cellMap.entries()) {
      cells[pid] = cell;
    }

    matrixRows.push({
      category,
      cells,
      total: Math.round(total * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      periodCount,
      max: Math.round(max * 100) / 100,
      maxPeriodId,
      trendPct,
    });
  }

  // Sort categories by total spend descending
  matrixRows.sort((a, b) => b.total - a.total);

  return { periods, categories: matrixRows, periodTotals };
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

// ─── Smart Amount Presets ──────────────────────────────────────────────────

export interface AmountPresetSuggestion {
  value: number;
  count: number;
}

// ─── Smart Title Presets ───────────────────────────────────────────────────

export interface TitlePreset {
  title: string;
  count: number;
  amount: number | null;
  type: string | null;
  category: string | null;
  last_used: string | null;
}

/**
 * Most frequently used transaction titles (case/whitespace-normalized),
 * with the modal (most common) amount/type/category for each title.
 * Used by Quick Add for title autocomplete + one-shot auto-fill on match.
 */
export function getTopTitles(limit = 30): TitlePreset[] {
  const rows = db.prepare(`
    SELECT
      LOWER(TRIM(title)) AS norm,
      COUNT(*) AS count,
      MAX(COALESCE(created_time, date)) AS last_used
    FROM transactions
    WHERE done = 1 AND TRIM(title) != ''
    GROUP BY norm
    ORDER BY count DESC, last_used DESC
    LIMIT ?
  `).all(limit) as Array<{ norm: string; count: number; last_used: string }>;
  if (rows.length === 0) return [];

  // Modal amount/type/category per normalized title (single pass per field)
  const modal = db.prepare(`
    SELECT LOWER(TRIM(title)) AS norm, amount, type, category, COUNT(*) AS cnt
    FROM transactions
    WHERE done = 1 AND TRIM(title) != ''
    GROUP BY norm, amount, type, category
  `).all() as Array<{ norm: string; amount: number; type: string; category: string; cnt: number }>;

  const best = new Map<string, { amount: number; type: string; category: string; cnt: number }>();
  for (const m of modal) {
    const cur = best.get(m.norm);
    if (!cur || m.cnt > cur.cnt) best.set(m.norm, m);
  }

  // Preserve original casing: pick the most recent original-cased variant per norm
  const cased = db.prepare(`
    SELECT title, LOWER(TRIM(title)) AS norm, COALESCE(created_time, date) AS ts
    FROM transactions
    WHERE done = 1 AND TRIM(title) != ''
    ORDER BY ts ASC
  `).all() as Array<{ title: string; norm: string; ts: string }>;
  const casing = new Map<string, string>();
  for (const c of cased) casing.set(c.norm, c.title); // later ts overwrites → most recent casing wins

  return rows.map((r) => {
    const b = best.get(r.norm);
    return {
      title: casing.get(r.norm) || r.norm,
      count: r.count,
      amount: b ? b.amount : null,
      type: b ? b.type : null,
      category: b ? b.category : null,
      last_used: r.last_used,
    };
  });
}

/**
 * Most frequently used exact amounts from recent paid expense transactions.
 * Used by Quick Add to personalize the amount preset chips.
 * Considers only cash/credit_expense (not income, not credit_payment —
 * those amounts are dictated by statements, not habit).
 */
export function getTopAmounts(limit = 6, periodWindow = 6): AmountPresetSuggestion[] {
  const rows = db.prepare(`
    SELECT t.amount as value, COUNT(*) as count
    FROM transactions t
    JOIN periods p ON t.period_id = p.id
    WHERE t.done = 1
      AND t.type IN ('cash', 'credit_expense')
      AND t.amount > 0
      AND p.start_date >= (
        SELECT COALESCE(MIN(start_date), '9999-99-99') FROM (
          SELECT start_date FROM periods ORDER BY start_date DESC LIMIT ?
        )
      )
    GROUP BY t.amount
    ORDER BY count DESC, t.amount ASC
    LIMIT ?
  `).all(periodWindow, limit) as AmountPresetSuggestion[];
  return rows;
}

// ─── Smart Category Suggestion ─────────────────────────────────────────────

export interface CategorySuggestion {
  category: string | null;
  confidence: number;
  match_type: 'exact' | 'prefix' | null;
  sample_count: number;
}

/**
 * Suggest a category for a transaction title based on historical data.
 *
 * Algorithm:
 * 1. Exact match (case-insensitive, trimmed): plurality vote across done=1
 *    transactions with the same title. Requires >=2 samples and >0.5 confidence.
 * 2. Prefix match fallback: uses the first word of the query to match variants
 *    (e.g. "Kopi Pagi" matches "Kopi Senja", "Kopi Kenangan"). Requires >=3
 *    samples and >0.5 confidence.
 * 3. Returns { category: null } if no reliable suggestion can be made.
 *
 * Only considers done=1 transactions (paid) — pending items may be miscategorized.
 */
export function suggestCategory(title: string): CategorySuggestion {
  const normalized = (title || '').trim().toLowerCase();
  if (!normalized) {
    return { category: null, confidence: 0, match_type: null, sample_count: 0 };
  }

  // Exact match: plurality vote across done=1 transactions
  const exactRows = db.prepare(`
    SELECT category, COUNT(*) as cnt
    FROM transactions
    WHERE done = 1 AND LOWER(TRIM(title)) = ?
    GROUP BY category
    ORDER BY cnt DESC
  `).all(normalized) as Array<{ category: string; cnt: number }>;

  const exactTotal = exactRows.reduce((s, r) => s + r.cnt, 0);
  if (exactTotal > 0) {
    const top = exactRows[0];
    const confidence = exactTotal > 0 ? top.cnt / exactTotal : 0;
    if (exactTotal >= 2 && confidence > 0.5) {
      return {
        category: top.category,
        confidence,
        match_type: 'exact',
        sample_count: exactTotal,
      };
    }
    // Match found but below threshold — report match_type but null category
    return {
      category: null,
      confidence,
      match_type: 'exact',
      sample_count: exactTotal,
    };
  }

  // Prefix match fallback — match on first word to capture variants
  // e.g. query "Kopi Pagi" matches titles "Kopi Senja", "Kopi Kenangan"
  const firstWord = normalized.split(/\s+/)[0];
  if (firstWord.length >= 3) {
    const prefixRows = db.prepare(`
      SELECT category, COUNT(*) as cnt
      FROM transactions
      WHERE done = 1 AND LOWER(TRIM(title)) LIKE ?
      GROUP BY category
      ORDER BY cnt DESC
    `).all(`${firstWord}%`) as Array<{ category: string; cnt: number }>;

    const prefixTotal = prefixRows.reduce((s, r) => s + r.cnt, 0);
    if (prefixTotal > 0) {
      const top = prefixRows[0];
      const confidence = prefixTotal > 0 ? top.cnt / prefixTotal : 0;
      if (prefixTotal >= 3 && confidence > 0.5) {
        return {
          category: top.category,
          confidence,
          match_type: 'prefix',
          sample_count: prefixTotal,
        };
      }
      return {
        category: null,
        confidence,
        match_type: 'prefix',
        sample_count: prefixTotal,
      };
    }
  }

  return { category: null, confidence: 0, match_type: null, sample_count: 0 };
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

// ─── Savings Rate Tracker ────────────────────────────────────────────────────

export interface SavingsRatePeriod {
  period_id: number;
  month: string;
  start_date: string;
  end_date: string;
  income: number;
  outcome: number;          // total paid spending (cash + credit_payment)
  savings: number;          // income - outcome
  savings_rate: number;     // pct, can be negative
  is_positive: boolean;
}

export interface SavingsRateResult {
  periods: SavingsRatePeriod[];
  current: SavingsRatePeriod | null;
  avg_rate: number;
  median_rate: number;
  best_rate: number;
  worst_rate: number;
  best_month: string | null;
  worst_month: string | null;
  positive_count: number;
  negative_count: number;
  total_periods: number;
  consecutive_positive: number;   // current run ending at latest period
  longest_positive_streak: number;
  total_saved: number;
  // Trailing-3 and trailing-6 average rates for trend detection
  trailing3_avg: number;
  trailing6_avg: number;
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * Compute per-period savings rate (income − outcome) / income.
 * Uses the same outcome definition as getMonthlySummary (cash + credit_payment, done=1).
 */
export function getSavingsRate(): SavingsRateResult {
  const periodRows = db.prepare(`
    SELECT DISTINCT p.id, p.month, p.start_date, p.end_date
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    ORDER BY p.start_date ASC
  `).all() as { id: number; month: string; start_date: string; end_date: string }[];

  // Income per period
  const incomeRows = db.prepare(`
    SELECT mi.period_id, mi.income, mi.other_income
    FROM monthly_income mi JOIN periods p ON mi.period_id = p.id
    ORDER BY p.start_date ASC
  `).all() as { period_id: number; income: number; other_income: number }[];
  const incomeMap = new Map<number, number>();
  for (const r of incomeRows) {
    incomeMap.set(r.period_id, (r.income || 0) + (r.other_income || 0));
  }

  // Outcome per period (cash + credit_payment, done=1) — same definition as summary
  const outcomeRows = db.prepare(`
    SELECT period_id, SUM(amount) AS outcome
    FROM transactions
    WHERE done = 1 AND type IN ('cash', 'credit_payment')
    GROUP BY period_id
  `).all() as { period_id: number; outcome: number }[];
  const outcomeMap = new Map<number, number>();
  for (const r of outcomeRows) {
    outcomeMap.set(r.period_id, r.outcome || 0);
  }

  const periods: SavingsRatePeriod[] = [];
  for (const p of periodRows) {
    const income = incomeMap.get(p.id) || 0;
    const outcome = outcomeMap.get(p.id) || 0;
    if (income <= 0) continue; // skip periods with no income — can't compute a rate
    const savings = income - outcome;
    const rate = (savings / income) * 100;
    periods.push({
      period_id: p.id,
      month: p.month,
      start_date: p.start_date,
      end_date: p.end_date,
      income,
      outcome,
      savings,
      savings_rate: Math.round(rate * 100) / 100,
      is_positive: savings >= 0,
    });
  }

  if (periods.length === 0) {
    return {
      periods: [], current: null, avg_rate: 0, median_rate: 0,
      best_rate: 0, worst_rate: 0, best_month: null, worst_month: null,
      positive_count: 0, negative_count: 0, total_periods: 0,
      consecutive_positive: 0, longest_positive_streak: 0, total_saved: 0,
      trailing3_avg: 0, trailing6_avg: 0, trend: 'stable',
    };
  }

  const rates = periods.map((p) => p.savings_rate);
  const sortedRates = [...rates].sort((a, b) => a - b);
  const n = rates.length;
  const avg = rates.reduce((s, r) => s + r, 0) / n;
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (sortedRates[mid - 1] + sortedRates[mid]) / 2 : sortedRates[mid];

  let bestIdx = 0, worstIdx = 0;
  for (let i = 1; i < n; i++) {
    if (rates[i] > rates[bestIdx]) bestIdx = i;
    if (rates[i] < rates[worstIdx]) worstIdx = i;
  }

  const positive_count = periods.filter((p) => p.is_positive).length;
  const negative_count = n - positive_count;

  // Consecutive positive streaks (ending at latest period)
  let consecutive_positive = 0;
  for (let i = n - 1; i >= 0; i--) {
    if (periods[i].is_positive) consecutive_positive++;
    else break;
  }
  let longest_positive_streak = 0;
  let run = 0;
  for (const p of periods) {
    if (p.is_positive) { run++; if (run > longest_positive_streak) longest_positive_streak = run; }
    else run = 0;
  }

  const total_saved = periods.reduce((s, p) => s + p.savings, 0);

  // Trailing averages
  const trailing3 = periods.slice(-3).map((p) => p.savings_rate);
  const trailing6 = periods.slice(-6).map((p) => p.savings_rate);
  const trailing3_avg = trailing3.reduce((s, r) => s + r, 0) / Math.max(1, trailing3.length);
  const trailing6_avg = trailing6.reduce((s, r) => s + r, 0) / Math.max(1, trailing6.length);

  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (n >= 3) {
    const diff = trailing3_avg - trailing6_avg;
    if (diff > 3) trend = 'improving';
    else if (diff < -3) trend = 'declining';
  }

  return {
    periods,
    current: periods[periods.length - 1],
    avg_rate: Math.round(avg * 100) / 100,
    median_rate: Math.round(median * 100) / 100,
    best_rate: rates[bestIdx],
    worst_rate: rates[worstIdx],
    best_month: periods[bestIdx].month,
    worst_month: periods[worstIdx].month,
    positive_count,
    negative_count,
    total_periods: n,
    consecutive_positive,
    longest_positive_streak,
    total_saved: Math.round(total_saved),
    trailing3_avg: Math.round(trailing3_avg * 100) / 100,
    trailing6_avg: Math.round(trailing6_avg * 100) / 100,
    trend,
  };
}

// ============================================================
// Spending Rhythm — behavioral day-of-week / time-of-day analysis
// Uses created_time to reveal WHEN you spend (not just how much).
// Aggregation is done in JS (not SQL strftime) because created_time
// has mixed formats (ISO 8601 AND human-readable) that new Date()
// handles but SQLite strftime() cannot.
// ============================================================

export interface RhythmDowStat {
  dow: number;            // 0=Sun .. 6=Sat
  label: string;          // "Sunday" ... "Saturday"
  shortLabel: string;     // "Sun" ... "Sat"
  isWeekend: boolean;
  txCount: number;
  totalSpend: number;
  avgPerTx: number;       // average amount per transaction
  distinctDays: number;   // how many distinct calendar days had spending on this weekday
  avgPerDay: number;      // totalSpend / distinctDays
  pctOfTotal: number;     // share of total spending
}

export interface RhythmTimeBucket {
  label: string;          // "Late Night", "Morning", etc.
  rangeLabel: string;     // "12–5am"
  txCount: number;
  totalSpend: number;
  pctOfTx: number;        // share of transaction count
  pctOfSpend: number;     // share of total spend
}

export interface RhythmCategoryCell {
  category: string;
  dow: number;            // 0=Sun .. 6=Sat
  total: number;
  count: number;
}

export interface RhythmInsight {
  icon: string;
  title: string;
  detail: string;
  tone: 'good' | 'neutral' | 'warn';
}

export interface SpendingRhythmResult {
  // overall
  totalTx: number;
  totalSpend: number;
  dateRangeStart: string | null;   // ISO of earliest tx
  dateRangeEnd: string | null;
  // day of week
  dowStats: RhythmDowStat[];       // 7 entries, ordered Mon-first (dow 1..6, 0)
  weekdayVsWeekend: {
    weekdayTx: number; weekdaySpend: number; weekdayAvgPerDay: number;
    weekendTx: number; weekendSpend: number; weekendAvgPerDay: number;
    weekdayPctSpend: number; weekendPctSpend: number;
  };
  peakDay: RhythmDowStat | null;    // highest avgPerDay
  quietDay: RhythmDowStat | null;   // lowest avgPerDay (among days with data)
  // time of day
  timeBuckets: RhythmTimeBucket[];  // 4 entries
  peakHour: number | null;          // 0-23
  // category x dow heatmap (top categories only)
  categoryHeatmap: { category: string; cells: number[] }[]; // cells[0..6] = total per dow
  // insights
  insights: RhythmInsight[];
}

const RHYTHM_DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const RHYTHM_DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseCreatedTimeSafe(raw: string | null | undefined): Date | null {
  if (!raw || raw.length < 5) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function getSpendingRhythm(): SpendingRhythmResult {
  // Pull all spending transactions with created_time.
  // Exclude only credit_payment (internal money movement) — same convention as
  // spending streaks. Keep cash + credit_expense.
  const rows = db.prepare(`
    SELECT id, title, category, amount, type, created_time
    FROM transactions
    WHERE done = 1
      AND type IN ('cash', 'credit_expense')
      AND created_time IS NOT NULL
      AND amount > 0
  `).all() as any[];

  // Accumulators
  const dowTxCount = new Array(7).fill(0);
  const dowTotal = new Array(7).fill(0);
  const dowDays = Array.from({ length: 7 }, () => new Set<string>());

  const hourTxCount = new Array(24).fill(0);
  const hourTotal = new Array(24).fill(0);

  // category x dow → { total, count }
  const catDowMap = new Map<string, { total: number; count: number; dowTotals: number[]; dowCounts: number[] }>();

  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  let totalSpend = 0;

  for (const r of rows) {
    const d = parseCreatedTimeSafe(r.created_time);
    if (!d) continue;
    const dow = d.getDay();       // 0-6
    const hour = d.getHours();    // 0-23
    const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

    dowTxCount[dow]++;
    dowTotal[dow] += r.amount;
    dowDays[dow].add(dayKey);

    hourTxCount[hour]++;
    hourTotal[hour] += r.amount;

    const cat = r.category || 'Unknown';
    if (!catDowMap.has(cat)) {
      catDowMap.set(cat, { total: 0, count: 0, dowTotals: new Array(7).fill(0), dowCounts: new Array(7).fill(0) });
    }
    const ce = catDowMap.get(cat)!;
    ce.total += r.amount;
    ce.count++;
    ce.dowTotals[dow] += r.amount;
    ce.dowCounts[dow]++;

    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
    totalSpend += r.amount;
  }

  // Build dowStats (order: Mon, Tue, Wed, Thu, Fri, Sat, Sun → display order)
  const order = [1, 2, 3, 4, 5, 6, 0];
  const dowStats: RhythmDowStat[] = order.map((dow) => {
    const distinctDays = dowDays[dow].size;
    const total = dowTotal[dow];
    return {
      dow,
      label: RHYTHM_DOW_FULL[dow],
      shortLabel: RHYTHM_DOW_SHORT[dow],
      isWeekend: dow === 0 || dow === 6,
      txCount: dowTxCount[dow],
      totalSpend: Math.round(total),
      avgPerTx: dowTxCount[dow] > 0 ? Math.round(total / dowTxCount[dow]) : 0,
      distinctDays,
      avgPerDay: distinctDays > 0 ? Math.round(total / distinctDays) : 0,
      pctOfTotal: totalSpend > 0 ? Number(((total / totalSpend) * 100).toFixed(1)) : 0,
    };
  });

  // Weekday vs weekend
  const weekdayDows = [1, 2, 3, 4, 5];
  const weekendDows = [0, 6];
  const sumReducer = (arr: number[], sel: number[]) => sel.reduce((s, d) => s + arr[d], 0);
  const weekdayTx = sumReducer(dowTxCount, weekdayDows);
  const weekendTx = sumReducer(dowTxCount, weekendDows);
  const weekdaySpend = sumReducer(dowTotal, weekdayDows);
  const weekendSpend = sumReducer(dowTotal, weekendDows);
  const weekdayDistinct = weekdayDows.reduce((s, d) => s + dowDays[d].size, 0);
  const weekendDistinct = weekendDows.reduce((s, d) => s + dowDays[d].size, 0);

  // Peak / quiet day
  const daysWithData = dowStats.filter((s) => s.distinctDays > 0);
  let peakDay: RhythmDowStat | null = null;
  let quietDay: RhythmDowStat | null = null;
  if (daysWithData.length > 0) {
    peakDay = daysWithData.reduce((best, s) => (s.avgPerDay > best.avgPerDay ? s : best));
    quietDay = daysWithData.reduce((worst, s) => (s.avgPerDay < worst.avgPerDay ? s : worst));
  }

  // Time buckets: Late Night (0-5), Morning (6-11), Afternoon (12-17), Evening (18-23)
  const bucketDefs = [
    { label: 'Late Night', rangeLabel: '12–6 AM', hours: [0, 1, 2, 3, 4, 5], icon: '🌙' },
    { label: 'Morning', rangeLabel: '6 AM–12 PM', hours: [6, 7, 8, 9, 10, 11], icon: '🌅' },
    { label: 'Afternoon', rangeLabel: '12–6 PM', hours: [12, 13, 14, 15, 16, 17], icon: '☀️' },
    { label: 'Evening', rangeLabel: '6 PM–12 AM', hours: [18, 19, 20, 21, 22, 23], icon: '🌆' },
  ];
  const totalTxWithHour = hourTxCount.reduce((s, c) => s + c, 0);
  const totalSpendHour = hourTotal.reduce((s, c) => s + c, 0);
  const timeBuckets: RhythmTimeBucket[] = bucketDefs.map((b) => {
    const txCount = b.hours.reduce((s, h) => s + hourTxCount[h], 0);
    const spend = b.hours.reduce((s, h) => s + hourTotal[h], 0);
    return {
      label: b.label,
      rangeLabel: b.rangeLabel,
      txCount,
      totalSpend: Math.round(spend),
      pctOfTx: totalTxWithHour > 0 ? Number(((txCount / totalTxWithHour) * 100).toFixed(1)) : 0,
      pctOfSpend: totalSpendHour > 0 ? Number(((spend / totalSpendHour) * 100).toFixed(1)) : 0,
    };
  });

  // Peak hour
  let peakHour: number | null = null;
  let peakHourCount = 0;
  for (let h = 0; h < 24; h++) {
    if (hourTxCount[h] > peakHourCount) { peakHourCount = hourTxCount[h]; peakHour = h; }
  }

  // Category x dow heatmap — top 8 categories by total
  const topCats = [...catDowMap.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8);
  const categoryHeatmap = topCats.map(([category, ce]) => ({
    category,
    cells: order.map((dow) => Math.round(ce.dowTotals[dow])),
  }));

  // ── Generate insights ──
  const insights: RhythmInsight[] = [];

  if (peakDay && quietDay && peakDay.dow !== quietDay.dow && quietDay.avgPerDay > 0) {
    const ratio = peakDay.avgPerDay / quietDay.avgPerDay;
    insights.push({
      icon: ratio >= 2 ? '⚡' : '📊',
      title: `${peakDay.label}s are your biggest spending day`,
      detail: `You spend ${ratio.toFixed(1)}× more on ${peakDay.label.toLowerCase()}s (${formatIdrInline(peakDay.avgPerDay)}/day) than ${quietDay.label.toLowerCase()}s (${formatIdrInline(quietDay.avgPerDay)}/day).`,
      tone: ratio >= 3 ? 'warn' : 'neutral',
    });
  }

  if (weekendDistinct > 0 && weekdayDistinct > 0) {
    const wkdAvgPerDay = weekdaySpend / weekdayDistinct;
    const wkeAvgPerDay = weekendSpend / weekendDistinct;
    if (wkeAvgPerDay > wkdAvgPerDay * 1.25) {
      insights.push({
        icon: '🎉',
        title: 'Weekends drain your wallet',
        detail: `Per-day weekend spending (${formatIdrInline(wkeAvgPerDay)}) is ${(wkeAvgPerDay / Math.max(1, wkdAvgPerDay)).toFixed(1)}× your weekday average (${formatIdrInline(wkdAvgPerDay)}).`,
        tone: 'warn',
      });
    } else if (wkdAvgPerDay > wkeAvgPerDay * 1.25) {
      insights.push({
        icon: '💼',
        title: 'You spend more on weekdays',
        detail: `Weekday spending (${formatIdrInline(wkdAvgPerDay)}/day) exceeds weekends (${formatIdrInline(wkeAvgPerDay)}/day) — likely commuting and work-day expenses.`,
        tone: 'neutral',
      });
    }
  }

  if (peakHour !== null) {
    const peakBucket = bucketDefs.find((b) => b.hours.includes(peakHour!));
    insights.push({
      icon: peakBucket?.icon ?? '🕒',
      title: `Peak spending hour: ${formatHour(peakHour)}`,
      detail: `Most transactions happen around ${formatHour(peakHour)} (${peakHourCount} transactions). ${peakBucket ? peakBucket.label + ' is your most active time window.' : ''}`,
      tone: 'neutral',
    });
  }

  // Find the dominant time bucket
  const dominantBucket = [...timeBuckets].sort((a, b) => b.txCount - a.txCount)[0];
  if (dominantBucket && dominantBucket.pctOfTx > 50) {
    insights.push({
      icon: dominantBucket.label === 'Late Night' ? '🌙' : dominantBucket.label === 'Morning' ? '🌅' : dominantBucket.label === 'Afternoon' ? '☀️' : '🌆',
      title: `${dominantBucket.label} spender`,
      detail: `${dominantBucket.pctOfTx}% of your transactions happen in the ${dominantBucket.label.toLowerCase()} (${dominantBucket.rangeLabel}).`,
      tone: dominantBucket.label === 'Late Night' ? 'warn' : 'neutral',
    });
  }

  // No-spend day: if any weekday has 0 distinct days (never spent on that weekday)
  const neverSpentDays = dowStats.filter((s) => s.distinctDays === 0);
  if (neverSpentDays.length > 0) {
    insights.push({
      icon: '🛡️',
      title: `You've never spent on a ${neverSpentDays.map((d) => d.label).join(' or ')}`,
      detail: `Across ${rows.length} tracked transactions, no spending has ever landed on a ${neverSpentDays[0].label}.`,
      tone: 'good',
    });
  }

  return {
    totalTx: rows.length,
    totalSpend: Math.round(totalSpend),
    dateRangeStart: minDate ? minDate.toISOString() : null,
    dateRangeEnd: maxDate ? maxDate.toISOString() : null,
    dowStats,
    weekdayVsWeekend: {
      weekdayTx, weekdaySpend: Math.round(weekdaySpend),
      weekendTx, weekendSpend: Math.round(weekendSpend),
      weekdayAvgPerDay: weekdayDistinct > 0 ? Math.round(weekdaySpend / weekdayDistinct) : 0,
      weekendAvgPerDay: weekendDistinct > 0 ? Math.round(weekendSpend / weekendDistinct) : 0,
      weekdayPctSpend: totalSpend > 0 ? Number(((weekdaySpend / totalSpend) * 100).toFixed(1)) : 0,
      weekendPctSpend: totalSpend > 0 ? Number(((weekendSpend / totalSpend) * 100).toFixed(1)) : 0,
    },
    peakDay,
    quietDay,
    timeBuckets,
    peakHour,
    categoryHeatmap,
    insights,
  };
}

function formatIdrInline(n: number): string {
  return 'IDR ' + Math.round(n).toLocaleString('id-ID');
}

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr} ${period}`;
}

// ============================================================
// Achievements & Milestones
// Aggregates net-worth milestones, savings streaks, spending
// discipline badges, and tracking longevity into a gamified
// "trophy case" view that celebrates financial progress.
// ============================================================

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;            // emoji
  category: 'networth' | 'savings' | 'discipline' | 'longevity' | 'diversity';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  unlockedDate: string | null;   // ISO date when threshold was first met
  progress?: { current: number; target: number; unit: string };
  value?: string;                // formatted milestone value when unlocked
}

export interface MilestoneHighlight {
  label: string;
  value: string;
  icon: string;
  subtext?: string;
}

export interface AchievementsResult {
  highlights: MilestoneHighlight[];
  badges: AchievementBadge[];
  unlockedCount: number;
  totalCount: number;
  nextMilestone: AchievementBadge | null;   // closest locked badge with progress
  levelInfo: {
    level: number;             // 1 point per unlocked badge
    title: string;             // rank title based on level
    progressToNext: number;    // 0-100
    pointsToNext: number;
  };
}

function getEarliestTxDate(): Date | null {
  const row = db.prepare(`
    SELECT MIN(COALESCE(created_time, date)) AS earliest FROM transactions
  `).get() as any;
  if (!row || !row.earliest) return null;
  const d = new Date(row.earliest);
  return isNaN(d.getTime()) ? null : d;
}

export function getAchievements(): AchievementsResult {
  // ── Pull the raw data we need ────────────────────────────────────────────
  const networthRows = db.prepare(`
    SELECT n.total, n.date, p.month, p.start_date
    FROM networth n JOIN periods p ON n.period_id = p.id
    ORDER BY p.start_date ASC
  `).all() as { total: number; date: string; month: string; start_date: string }[];

  const summaryRows = db.prepare(`
    SELECT p.id AS period_id, p.month, p.start_date,
           SUM(CASE WHEN t.done=1 AND t.type='cash' THEN t.amount ELSE 0 END) AS cash,
           SUM(CASE WHEN t.done=1 AND t.type='credit_payment' THEN t.amount ELSE 0 END) AS credit_payment,
           SUM(CASE WHEN t.done=1 AND t.type='credit_expense' THEN t.amount ELSE 0 END) AS credit_expense
    FROM periods p
    INNER JOIN transactions t ON t.period_id = p.id
    GROUP BY p.id
    ORDER BY p.start_date ASC
  `).all() as any[];

  const incomeRows = db.prepare(`
    SELECT mi.period_id, mi.income, mi.other_income
    FROM monthly_income mi
  `).all() as any[];
  const incomeByPeriod = new Map(incomeRows.map((r) => [r.period_id, r.income + (r.other_income || 0)]));

  // Per-period savings (income - total outflow) and savings rate
  const perPeriod = summaryRows.map((s) => {
    const outcome = (s.cash || 0) + (s.credit_payment || 0);
    const income = incomeByPeriod.get(s.period_id) || 0;
    const savings = income - outcome;
    const rate = income > 0 ? (savings / income) * 100 : 0;
    return { ...s, income, outcome, savings, rate };
  });

  const allTxRow = db.prepare(`
    SELECT COUNT(*) AS c,
           SUM(CASE WHEN done=1 AND type IN ('cash','credit_expense') THEN amount ELSE 0 END) AS total_spend
    FROM transactions
  `).get() as any;

  const distinctCategories = db.prepare(`
    SELECT COUNT(DISTINCT category) AS c FROM transactions WHERE done=1
  `).get() as any;

  // Consecutive positive-savings periods (ending at the most recent period)
  let savingsStreak = 0;
  for (let i = perPeriod.length - 1; i >= 0; i--) {
    if (perPeriod[i].income > 0 && perPeriod[i].savings > 0) savingsStreak++;
    else if (perPeriod[i].income > 0) break; // a period with income but no savings breaks the streak
  }

  // Best (highest) single-period savings rate, and how many periods were ≥10%, ≥20%, ≥30%
  let bestRate = 0;
  let periodsAbove10 = 0;
  let periodsAbove20 = 0;
  let periodsAbove30 = 0;
  for (const p of perPeriod) {
    if (p.income <= 0) continue;
    if (p.rate > bestRate) bestRate = p.rate;
    if (p.rate >= 10) periodsAbove10++;
    if (p.rate >= 20) periodsAbove20++;
    if (p.rate >= 30) periodsAbove30++;
  }

  // Peak net worth + growth from first to last
  let peakNw = 0;
  let peakNwMonth = '';
  for (const n of networthRows) {
    if (n.total > peakNw) { peakNw = n.total; peakNwMonth = n.month; }
  }
  const firstNw = networthRows.length > 0 ? networthRows[0].total : 0;
  const lastNw = networthRows.length > 0 ? networthRows[networthRows.length - 1].total : 0;
  const nwGrowth = lastNw - firstNw;
  const nwGrowthPct = firstNw > 0 ? (nwGrowth / firstNw) * 100 : 0;

  // Tracking longevity (days since first transaction)
  const earliest = getEarliestTxDate();
  const today = new Date();
  const daysTracked = earliest ? Math.floor((today.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // Spending discipline: largest single discretionary tx, and whether it's < 30% of monthly income
  const largestTxRow = db.prepare(`
    SELECT amount, title, category, date, period_id FROM transactions
    WHERE done=1 AND type IN ('cash','credit_expense')
    ORDER BY amount DESC LIMIT 1
  `).get() as any;
  const largestTx = largestTxRow?.amount ?? 0;

  // ── Net-worth milestone thresholds (IDR) ─────────────────────────────────
  const nwThresholds = [
    { target: 10_000_000,  label: '10 Million',  tier: 'bronze',   icon: '🥉' },
    { target: 25_000_000,  label: '25 Million',  tier: 'silver',   icon: '🥈' },
    { target: 50_000_000,  label: '50 Million',  tier: 'gold',     icon: '🥇' },
    { target: 100_000_000, label: '100 Million', tier: 'platinum', icon: '💎' },
    { target: 500_000_000, label: '500 Million', tier: 'platinum', icon: '👑' },
  ];

  // ── Build badge list ─────────────────────────────────────────────────────
  const badges: AchievementBadge[] = [];

  // Net-worth milestones (based on peak)
  for (const t of nwThresholds) {
    const unlocked = peakNw >= t.target;
    badges.push({
      id: `nw-${t.target}`,
      title: `${t.label} Club`,
      description: `Reach IDR ${t.target.toLocaleString('id-ID')} net worth`,
      icon: t.icon,
      category: 'networth',
      tier: t.tier as any,
      unlocked,
      unlockedDate: unlocked ? (networthRows.find((n) => n.total >= t.target)?.start_date ?? null) : null,
      progress: !unlocked ? { current: Math.max(0, peakNw), target: t.target, unit: 'IDR' } : undefined,
      value: unlocked ? `First hit in ${networthRows.find((n) => n.total >= t.target)?.month ?? '—'}` : undefined,
    });
  }

  // Net-worth growth badges
  if (firstNw > 0) {
    badges.push({
      id: 'nw-double',
      title: 'Doubling Down',
      description: 'Double your initial recorded net worth',
      icon: '📈',
      category: 'networth',
      tier: 'gold',
      unlocked: lastNw >= firstNw * 2,
      unlockedDate: null,
      progress: lastNw < firstNw * 2 ? { current: Math.max(0, nwGrowthPct), target: 100, unit: '%' } : undefined,
      value: lastNw >= firstNw * 2 ? `+${nwGrowthPct.toFixed(0)}% growth` : undefined,
    });
    badges.push({
      id: 'nw-growth-25',
      title: 'Climbing Higher',
      description: 'Grow net worth by 25% from your starting point',
      icon: '🚀',
      category: 'networth',
      tier: 'silver',
      unlocked: nwGrowthPct >= 25,
      unlockedDate: null,
      progress: nwGrowthPct < 25 ? { current: Math.max(0, nwGrowthPct), target: 25, unit: '%' } : undefined,
      value: nwGrowthPct >= 25 ? `+${nwGrowthPct.toFixed(0)}% from start` : undefined,
    });
  }

  // Savings streak badges
  badges.push({
    id: 'saver-streak-2',
    title: 'Consistent Saver',
    description: 'Save money 2 salary periods in a row',
    icon: '🐷',
    category: 'savings',
    tier: 'bronze',
    unlocked: savingsStreak >= 2,
    unlockedDate: null,
    progress: savingsStreak < 2 ? { current: savingsStreak, target: 2, unit: 'periods' } : undefined,
    value: savingsStreak >= 2 ? `${savingsStreak}-period streak` : undefined,
  });
  badges.push({
    id: 'saver-streak-3',
    title: 'Savings Machine',
    description: 'Save money 3 salary periods in a row',
    icon: '⚙️',
    category: 'savings',
    tier: 'silver',
    unlocked: savingsStreak >= 3,
    unlockedDate: null,
    progress: savingsStreak < 3 ? { current: savingsStreak, target: 3, unit: 'periods' } : undefined,
    value: savingsStreak >= 3 ? `${savingsStreak}-period streak` : undefined,
  });
  badges.push({
    id: 'saver-streak-6',
    title: 'Savings Virtuoso',
    description: 'Save money 6 salary periods in a row',
    icon: '🏆',
    category: 'savings',
    tier: 'gold',
    unlocked: savingsStreak >= 6,
    unlockedDate: null,
    progress: savingsStreak < 6 ? { current: savingsStreak, target: 6, unit: 'periods' } : undefined,
    value: savingsStreak >= 6 ? `${savingsStreak}-period streak` : undefined,
  });

  // Savings-rate badges
  badges.push({
    id: 'rate-10',
    title: 'Ten Percent Club',
    description: 'Save 10%+ of income in any period',
    icon: '🔟',
    category: 'savings',
    tier: 'bronze',
    unlocked: bestRate >= 10,
    unlockedDate: null,
    progress: bestRate < 10 ? { current: Math.max(0, bestRate), target: 10, unit: '%' } : undefined,
    value: bestRate >= 10 ? `Best: ${bestRate.toFixed(1)}%` : undefined,
  });
  badges.push({
    id: 'rate-20',
    title: 'Twenty Percent Elite',
    description: 'Save 20%+ of income in any period',
    icon: '⭐',
    category: 'savings',
    tier: 'silver',
    unlocked: bestRate >= 20,
    unlockedDate: null,
    progress: bestRate < 20 ? { current: Math.max(0, bestRate), target: 20, unit: '%' } : undefined,
    value: bestRate >= 20 ? `Best: ${bestRate.toFixed(1)}%` : undefined,
  });
  badges.push({
    id: 'rate-30',
    title: 'Thirty Percent Master',
    description: 'Save 30%+ of income in any period',
    icon: '🌟',
    category: 'savings',
    tier: 'gold',
    unlocked: bestRate >= 30,
    unlockedDate: null,
    progress: bestRate < 30 ? { current: Math.max(0, bestRate), target: 30, unit: '%' } : undefined,
    value: bestRate >= 30 ? `Best: ${bestRate.toFixed(1)}%` : undefined,
  });

  // Longevity badges
  badges.push({
    id: 'track-30',
    title: 'Getting Started',
    description: 'Track your finances for 30 days',
    icon: '🌱',
    category: 'longevity',
    tier: 'bronze',
    unlocked: daysTracked >= 30,
    unlockedDate: null,
    progress: daysTracked < 30 ? { current: daysTracked, target: 30, unit: 'days' } : undefined,
    value: daysTracked >= 30 ? `${daysTracked} days tracked` : undefined,
  });
  badges.push({
    id: 'track-90',
    title: 'Quarter Master',
    description: 'Track your finances for 90 days',
    icon: '📅',
    category: 'longevity',
    tier: 'silver',
    unlocked: daysTracked >= 90,
    unlockedDate: null,
    progress: daysTracked < 90 ? { current: daysTracked, target: 90, unit: 'days' } : undefined,
    value: daysTracked >= 90 ? `${daysTracked} days tracked` : undefined,
  });
  badges.push({
    id: 'track-365',
    title: 'One Year Strong',
    description: 'Track your finances for a full year',
    icon: '🎂',
    category: 'longevity',
    tier: 'gold',
    unlocked: daysTracked >= 365,
    unlockedDate: null,
    progress: daysTracked < 365 ? { current: daysTracked, target: 365, unit: 'days' } : undefined,
    value: daysTracked >= 365 ? `${Math.floor(daysTracked / 30)} months tracked` : undefined,
  });

  // Discipline badges
  if (largestTxRow) {
    badges.push({
      id: 'no-impulse-1m',
      title: 'Big Spender Under Control',
      description: 'Keep every single transaction under IDR 1,000,000',
      icon: '🛡️',
      category: 'discipline',
      tier: 'silver',
      unlocked: largestTx < 1_000_000,
      unlockedDate: null,
      progress: largestTx >= 1_000_000 ? { current: 1_000_000, target: largestTx, unit: 'IDR' } : undefined,
      value: largestTx < 1_000_000 ? 'Largest tx < 1M' : undefined,
    });
  }

  // Diversity badges
  badges.push({
    id: 'cat-5',
    title: 'Category Explorer',
    description: 'Use 5 or more spending categories',
    icon: '🎨',
    category: 'diversity',
    tier: 'bronze',
    unlocked: distinctCategories.c >= 5,
    unlockedDate: null,
    progress: distinctCategories.c < 5 ? { current: distinctCategories.c, target: 5, unit: 'categories' } : undefined,
    value: distinctCategories.c >= 5 ? `${distinctCategories.c} categories` : undefined,
  });
  badges.push({
    id: 'cat-10',
    title: 'Category Master',
    description: 'Use 10 or more spending categories',
    icon: '🗂️',
    category: 'diversity',
    tier: 'silver',
    unlocked: distinctCategories.c >= 10,
    unlockedDate: null,
    progress: distinctCategories.c < 10 ? { current: distinctCategories.c, target: 10, unit: 'categories' } : undefined,
    value: distinctCategories.c >= 10 ? `${distinctCategories.c} categories` : undefined,
  });

  // ── Compute highlights (top stat cards) ──────────────────────────────────
  const highlights: MilestoneHighlight[] = [
    {
      label: 'Net Worth Peak',
      value: formatIdrInline(peakNw),
      icon: '💎',
      subtext: peakNwMonth ? `Reached in ${peakNwMonth}` : undefined,
    },
    {
      label: 'Total Tracked Spend',
      value: formatIdrInline(allTxRow.total_spend || 0),
      icon: '💸',
      subtext: `${allTxRow.c || 0} transactions logged`,
    },
    {
      label: 'Best Savings Rate',
      value: bestRate > 0 ? `${bestRate.toFixed(1)}%` : '—',
      icon: '💰',
      subtext: `${periodsAbove10} period(s) above 10%`,
    },
    {
      label: 'Savings Streak',
      value: `${savingsStreak}`,
      icon: '🔥',
      subtext: 'consecutive saving periods',
    },
    {
      label: 'Tracking Span',
      value: daysTracked > 0 ? `${Math.floor(daysTracked / 30)} mo` : '—',
      icon: '📅',
      subtext: `${daysTracked} days since first entry`,
    },
    {
      label: 'Net Worth Growth',
      value: nwGrowthPct !== 0 ? `${nwGrowthPct >= 0 ? '+' : ''}${nwGrowthPct.toFixed(0)}%` : '—',
      icon: nwGrowthPct >= 0 ? '📈' : '📉',
      subtext: `from ${formatIdrInline(firstNw)}`,
    },
  ];

  // ── Level / rank computation ─────────────────────────────────────────────
  const unlockedBadges = badges.filter((b) => b.unlocked);
  const unlockedCount = unlockedBadges.length;
  const totalCount = badges.length;
  const level = unlockedCount;

  const rankTitles = [
    'Newcomer', 'Tracker', 'Saver', 'Budgeter', 'Wealth Builder',
    'Investor', 'Disciplined', 'Strategist', 'Master', 'Guru', 'Legend',
  ];
  const title = rankTitles[Math.min(level, rankTitles.length - 1)];

  // Find next locked badge with the closest progress ratio
  const lockedWithProgress = badges
    .filter((b) => !b.unlocked && b.progress)
    .map((b) => ({ badge: b, ratio: (b.progress!.current / b.progress!.target) }))
    .sort((a, b) => b.ratio - a.ratio);
  const nextMilestone = lockedWithProgress.length > 0 ? lockedWithProgress[0].badge : null;
  const pointsToNext = totalCount - unlockedCount;

  // Progress to next level: based on overall completion
  const progressToNext = Math.round((unlockedCount / Math.max(totalCount, 1)) * 100);

  return {
    highlights,
    badges,
    unlockedCount,
    totalCount,
    nextMilestone,
    levelInfo: {
      level,
      title,
      progressToNext,
      pointsToNext,
    },
  };
}

// ─── Weekly Spending Tracker ──────────────────────────────────────────────────

export interface WeeklyBucket {
  weekNum: number;
  label: string;       // "Week 1 (May 21–27)"
  startDate: string;   // "2026-05-21"
  endDate: string;     // "2026-05-27"
  total: number;
  txCount: number;
  categoryTotals: Record<string, number>;
  avgDaily: number;
}

export interface WeeklySpendingResult {
  periodId: number;
  month: string;
  periodStart: string;
  periodEnd: string;
  weeks: WeeklyBucket[];
  totalSpend: number;
  totalTxCount: number;
  weeklyBudget: number;
  daysPerWeek: number[];
  income: number;
}

export function getWeeklySpending(periodId: number): WeeklySpendingResult {
  // Get period info
  const period = db.prepare('SELECT id, month, start_date, end_date FROM periods WHERE id = ?').get(periodId) as any;
  if (!period) {
    return { periodId, month: '', periodStart: '', periodEnd: '', weeks: [], totalSpend: 0, totalTxCount: 0, weeklyBudget: 0, daysPerWeek: [], income: 0 };
  }

  const startParts = period.start_date.split('-').map(Number);
  const endParts = period.end_date.split('-').map(Number);
  // Use local date construction to avoid UTC offset issues
  const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const end = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59);

  // Get income for the period
  const incomeRow = db.prepare('SELECT income FROM monthly_income WHERE period_id = ?').get(periodId) as any;
  const income = incomeRow?.income ?? 0;

  // Get all expense transactions for the period with created_time
  const txs = db.prepare(
    'SELECT id, title, category, amount, type, done, created_time, date FROM transactions WHERE period_id = ? AND done = 1 AND type IN (\'cash\', \'credit_expense\')'
  ).all(periodId) as any[];

  // Build weeks: 7-day buckets from period start
  const weeks: WeeklyBucket[] = [];
  let weekStart = new Date(start);
  let weekNum = 1;

  while (weekStart <= end) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > end) weekEnd.setTime(end.getTime());

    const startDateStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const endDateStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const label = `Week ${weekNum} (${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}${weekEnd.getMonth() !== weekStart.getMonth() ? ' – ' + monthNames[weekEnd.getMonth()] + ' ' : '–'}${weekEnd.getDate()})`;

    // Filter transactions that fall in this week using created_time
    const weekTxs = txs.filter((t) => {
      let txDate: Date;
      if (t.created_time) {
        txDate = new Date(t.created_time);
      } else {
        txDate = new Date(t.date);
      }
      return txDate >= weekStart && txDate <= new Date(weekEnd.getTime() + 86399999); // include end day
    });

    const total = weekTxs.reduce((s, t) => s + t.amount, 0);
    const categoryTotals: Record<string, number> = {};
    weekTxs.forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const daysInWeek = Math.min(7, Math.floor((weekEnd.getTime() - weekStart.getTime()) / 86400000) + 1);
    const avgDaily = daysInWeek > 0 ? total / daysInWeek : 0;

    weeks.push({
      weekNum,
      label,
      startDate: startDateStr,
      endDate: endDateStr,
      total,
      txCount: weekTxs.length,
      categoryTotals,
      avgDaily,
    });

    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() + 7);
    weekNum++;
  }

  const totalSpend = weeks.reduce((s, w) => s + w.total, 0);
  const totalTxCount = weeks.reduce((s, w) => s + w.txCount, 0);

  // Weekly budget = income / number of weeks
  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  const numWeeks = Math.ceil(totalDays / 7);
  const weeklyBudget = income > 0 ? income / numWeeks : 0;

  const daysPerWeek = weeks.map((w) => {
    const sp = w.startDate.split('-').map(Number);
    const ep = w.endDate.split('-').map(Number);
    const s = new Date(sp[0], sp[1] - 1, sp[2]);
    const e = new Date(ep[0], ep[1] - 1, ep[2]);
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
  });

  return {
    periodId,
    month: period.month,
    periodStart: period.start_date,
    periodEnd: period.end_date,
    weeks,
    totalSpend,
    totalTxCount,
    weeklyBudget,
    daysPerWeek,
    income,
  };
}

// ─── Recurring Cost Analysis ────────────────────────────────────────────────

export interface RecurringCostItem {
  id: number;
  title: string;
  category: string;
  amount: number;
  type: 'cash' | 'credit_expense' | 'credit_payment';
  active: boolean;
  end_date: string | null;
  isTemporary: boolean;
}

export interface RecurringCostResult {
  items: RecurringCostItem[];
  activeItems: RecurringCostItem[];
  pausedItems: RecurringCostItem[];
  monthlyTotal: number;
  annualTotal: number;
  monthlyByCategory: Record<string, number>;
  monthlyByType: { cash: number; credit_expense: number; credit_payment: number };
  categoryCount: number;
  activeCount: number;
  temporaryCount: number;
  largestItem: RecurringCostItem | null;
  avgPerItem: number;
}

export function getRecurringCostAnalysis(): RecurringCostResult {
  const rows = db.prepare(`
    SELECT id, title, category, amount, type, active, end_date
    FROM recurring_transactions
    ORDER BY active DESC, amount DESC
  `).all() as any[];

  const items: RecurringCostItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    amount: r.amount,
    type: r.type,
    active: !!r.active,
    end_date: r.end_date,
    isTemporary: !!r.end_date,
  }));

  const activeItems = items.filter((i) => i.active);
  const pausedItems = items.filter((i) => !i.active);

  const monthlyTotal = activeItems.reduce((s, i) => s + i.amount, 0);
  const annualTotal = monthlyTotal * 12;

  const monthlyByCategory: Record<string, number> = {};
  for (const item of activeItems) {
    monthlyByCategory[item.category] = (monthlyByCategory[item.category] || 0) + item.amount;
  }

  const monthlyByType = { cash: 0, credit_expense: 0, credit_payment: 0 };
  for (const item of activeItems) {
    if (item.type in monthlyByType) {
      monthlyByType[item.type as keyof typeof monthlyByType] += item.amount;
    }
  }

  const temporaryCount = activeItems.filter((i) => i.isTemporary).length;
  const largestItem = activeItems.length > 0
    ? activeItems.reduce((max, i) => (i.amount > max.amount ? i : max))
    : null;
  const avgPerItem = activeItems.length > 0 ? monthlyTotal / activeItems.length : 0;

  return {
    items,
    activeItems,
    pausedItems,
    monthlyTotal,
    annualTotal,
    monthlyByCategory,
    monthlyByType,
    categoryCount: Object.keys(monthlyByCategory).length,
    activeCount: activeItems.length,
    temporaryCount,
    largestItem,
    avgPerItem,
  };
}

// ─── Budget Pace ───────────────────────────────────────────────────────────

export interface BudgetPaceCategory {
  category: string;
  color: string;
  limit: number;
  spent: number;
  spent_pct: number;       // spent / limit * 100
  expected_pct: number;    // time_elapsed_pct, same for all categories
  pace_diff: number;       // spent_pct - expected_pct (positive = over pace)
  pace_status: 'on_track' | 'warning' | 'over_pace' | 'under_budget' | 'no_limit';
  projected_total: number; // linear projection at end of period
  days_elapsed: number;
  days_total: number;
}

export interface BudgetPaceResult {
  period_id: number;
  period_label: string;
  start_date: string;
  end_date: string;
  days_elapsed: number;
  days_total: number;
  time_elapsed_pct: number;    // days_elapsed / days_total * 100
  total_budget: number;        // sum of all category limits
  total_spent: number;         // sum of actual spending in budgeted categories
  total_expected: number;      // linear: total_budget * time_elapsed_pct / 100
  total_pace_diff: number;     // total_spent - total_expected
  total_pace_pct: number;      // (spent - expected) / expected * 100
  total_projected: number;     // projected total at period end
  overall_status: 'on_track' | 'warning' | 'over_pace' | 'critical';
  categories: BudgetPaceCategory[];
}

export function getBudgetPace(periodId?: number): BudgetPaceResult {
  // Resolve period
  const period = periodId
    ? db.prepare('SELECT * FROM periods WHERE id = ?').get(periodId) as any
    : getActivePeriod();

  if (!period) {
    // No active period — return empty result
    return {
      period_id: 0,
      period_label: 'N/A',
      start_date: '',
      end_date: '',
      days_elapsed: 0,
      days_total: 0,
      time_elapsed_pct: 0,
      total_budget: 0,
      total_spent: 0,
      total_expected: 0,
      total_pace_diff: 0,
      total_pace_pct: 0,
      total_projected: 0,
      overall_status: 'on_track',
      categories: [],
    };
  }

  const startDate = new Date(period.start_date + 'T00:00:00');
  const endDate = new Date(period.end_date + 'T23:59:59');
  const now = new Date();

  const msPerDay = 1000 * 60 * 60 * 24;
  const days_total = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1);
  const days_elapsed = Math.min(
    days_total,
    Math.max(0, Math.round((now.getTime() - startDate.getTime()) / msPerDay) + 1)
  );
  const time_elapsed_pct = (days_elapsed / days_total) * 100;

  // Get all categories with limits
  const categories = db.prepare('SELECT name, color, monthly_limit FROM categories WHERE monthly_limit > 0').all() as any[];

  // Get spending per category for this period (done=1, spending types only)
  const spending = db.prepare(`
    SELECT category, SUM(amount) as spent
    FROM transactions
    WHERE period_id = ? AND done = 1 AND type IN ('cash', 'credit_expense')
    GROUP BY category
  `).all(period.id) as any[];

  const spendingMap = new Map<string, number>();
  spending.forEach((s) => spendingMap.set(s.category, s.spent));

  let total_budget = 0;
  let total_spent = 0;

  const paceCategories: BudgetPaceCategory[] = categories.map((cat) => {
    const limit = cat.monthly_limit || 0;
    const spent = spendingMap.get(cat.name) || 0;
    const spent_pct = limit > 0 ? (spent / limit) * 100 : 0;
    const expected_pct = time_elapsed_pct;
    const pace_diff = spent_pct - expected_pct;
    const projected_total = days_elapsed > 0 ? (spent / days_elapsed) * days_total : 0;

    let pace_status: BudgetPaceCategory['pace_status'];
    if (limit === 0) {
      pace_status = 'no_limit';
    } else if (spent >= limit) {
      pace_status = 'over_pace';
    } else if (pace_diff > 15) {
      pace_status = 'over_pace';
    } else if (pace_diff > 5) {
      pace_status = 'warning';
    } else if (spent_pct < expected_pct - 20) {
      pace_status = 'under_budget';
    } else {
      pace_status = 'on_track';
    }

    total_budget += limit;
    total_spent += spent;

    return {
      category: cat.name,
      color: cat.color,
      limit,
      spent,
      spent_pct,
      expected_pct,
      pace_diff,
      pace_status,
      projected_total,
      days_elapsed,
      days_total,
    };
  });

  const total_expected = total_budget * (time_elapsed_pct / 100);
  const total_pace_diff = total_spent - total_expected;
  const total_pace_pct = total_expected > 0 ? (total_pace_diff / total_expected) * 100 : 0;
  const total_projected = days_elapsed > 0 ? (total_spent / days_elapsed) * days_total : 0;

  let overall_status: BudgetPaceResult['overall_status'];
  if (total_budget === 0) {
    overall_status = 'on_track';
  } else if (total_spent >= total_budget) {
    overall_status = 'critical';
  } else if (total_pace_pct > 15) {
    overall_status = 'over_pace';
  } else if (total_pace_pct > 5) {
    overall_status = 'warning';
  } else {
    overall_status = 'on_track';
  }

  return {
    period_id: period.id,
    period_label: period.month,
    start_date: period.start_date,
    end_date: period.end_date,
    days_elapsed,
    days_total,
    time_elapsed_pct,
    total_budget,
    total_spent,
    total_expected,
    total_pace_diff,
    total_pace_pct,
    total_projected,
    overall_status,
    categories: paceCategories,
  };
}
