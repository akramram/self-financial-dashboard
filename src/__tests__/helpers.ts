import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

/**
 * Creates a temporary, isolated SQLite database with the full app schema.
 * Returns { db, dbPath, cleanup }.
 *
 * Usage in beforeEach/afterEach:
 *   const { db, dbPath, cleanup } = createTestDb();
 *   // ... use db directly or re-export db.ts functions via a wrapper
 *   cleanup();
 *
 * We re-implement the schema here (mirroring src/lib/db.ts) so tests
 * don't accidentally touch the real data/financial.db.
 */
export function createTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fin-dashboard-test-'));
  const dbPath = path.join(dir, 'test.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Replicate the full schema from src/lib/db.ts
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
      created_time TEXT,
      notes TEXT DEFAULT ''
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

  function cleanup() {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }

  return { db, dbPath, dir, cleanup };
}

/**
 * Helper: seed a period and return it.
 */
export function seedPeriod(db: Database.Database, month = 'July 2026') {
  db.prepare('INSERT INTO periods (month, start_date, end_date) VALUES (?, ?, ?)')
    .run(month, '2026-06-21', '2026-07-20');
  return db.prepare('SELECT * FROM periods WHERE month = ?').get(month) as any;
}

/**
 * Helper: seed a transaction and return it.
 */
export function seedTransaction(db: Database.Database, periodId: number, overrides?: Partial<any>) {
  const tx = {
    period_id: periodId,
    date: '2026-07-08',
    title: 'Test Transaction',
    category: 'Food',
    amount: 50000,
    currency: 'IDR',
    type: 'cash',
    payment_method: 'Cash',
    done: 1,
    created_time: new Date().toISOString(),
    notes: '',
    ...overrides,
  };
  const result = db.prepare(`
    INSERT INTO transactions (period_id, date, title, category, amount, currency, type, payment_method, done, created_time, notes)
    VALUES (@period_id, @date, @title, @category, @amount, @currency, @type, @payment_method, @done, @created_time, @notes)
  `).run(tx);
  return { ...tx, id: Number(result.lastInsertRowid) };
}

/**
 * Helper: seed a category and return it.
 */
export function seedCategory(db: Database.Database, name = 'Food', color = '#ef4444', monthlyLimit = 500000) {
  const result = db.prepare(`INSERT INTO categories (name, color, monthly_limit) VALUES (?, ?, ?)`)
    .run(name, color, monthlyLimit);
  return { id: Number(result.lastInsertRowid), name, color, monthly_limit: monthlyLimit };
}
