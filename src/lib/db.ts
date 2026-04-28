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
