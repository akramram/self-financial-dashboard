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

    CREATE INDEX IF NOT EXISTS idx_tx_month ON transactions(month);
    CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
  `);
}

export function getTransactions(filters?: { month?: string; type?: string; search?: string }) {
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
  sql += ' ORDER BY COALESCE(created_time, date) DESC';
  return db.prepare(sql).all(...params) as any[];
}

export function getTransactionById(id: number) {
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
}

function normalizeTx(tx: any) {
  const copy = { ...tx };
  if (typeof copy.done === 'boolean') copy.done = copy.done ? 1 : 0;
  if (!copy.created_time) copy.created_time = new Date().toISOString();
  return copy;
}

export function insertTransaction(tx: Omit<any, 'id'>) {
  const normalized = normalizeTx(tx);
  const stmt = db.prepare(`
    INSERT INTO transactions (month, date, title, category, amount, currency, type, payment_method, done, created_time)
    VALUES (@month, @date, @title, @category, @amount, @currency, @type, @payment_method, @done, @created_time)
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
    SELECT DISTINCT month, date FROM transactions ORDER BY date ASC
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
    tx.filter((t) => t.type === 'cash' || t.type === 'credit_expense').forEach((t) => {
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
