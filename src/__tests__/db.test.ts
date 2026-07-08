import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, seedPeriod, seedTransaction, seedCategory } from './helpers';

describe('DB — Periods', () => {
  let db: any, cleanup: () => void;

  beforeEach(() => {
    const t = createTestDb();
    db = t.db;
    cleanup = t.cleanup;
  });

  afterEach(() => cleanup());

  it('creates and retrieves a period by month', () => {
    const p = seedPeriod(db, 'July 2026');
    expect(p).toBeDefined();
    expect(p.month).toBe('July 2026');
    expect(p.start_date).toBe('2026-06-21');
    expect(p.end_date).toBe('2026-07-20');

    const found = db.prepare('SELECT * FROM periods WHERE month = ?').get('July 2026') as any;
    expect(found.id).toBe(p.id);
  });

  it('rejects duplicate month', () => {
    seedPeriod(db, 'July 2026');
    expect(() => seedPeriod(db, 'July 2026')).toThrow();
  });

  it('getAllPeriods returns periods in order', () => {
    seedPeriod(db, 'June 2026');
    seedPeriod(db, 'July 2026');
    const rows = db.prepare('SELECT * FROM periods ORDER BY start_date ASC').all() as any[];
    expect(rows).toHaveLength(2);
    expect(rows[0].month).toBe('June 2026');
    expect(rows[1].month).toBe('July 2026');
  });
});

describe('DB — Transactions CRUD', () => {
  let db: any, cleanup: () => void;
  let periodId: number;

  beforeEach(() => {
    const t = createTestDb();
    db = t.db;
    cleanup = t.cleanup;
    const p = seedPeriod(db);
    periodId = p.id;
  });

  afterEach(() => cleanup());

  it('inserts and retrieves a transaction', () => {
    const tx = seedTransaction(db, periodId, { title: 'Nasi Padang', amount: 25000 });
    expect(tx.id).toBeDefined();
    expect(tx.title).toBe('Nasi Padang');
    expect(tx.amount).toBe(25000);

    const found = db.prepare('SELECT * FROM transactions WHERE id = ?').get(tx.id) as any;
    expect(found.title).toBe('Nasi Padang');
  });

  it('retrieves transactions filtered by period_id', () => {
    seedTransaction(db, periodId, { title: 'Tx in period A' });
    const p2 = seedPeriod(db, 'August 2026');
    seedTransaction(db, p2.id, { title: 'Tx in period B' });

    const rows = db.prepare('SELECT * FROM transactions WHERE period_id = ?').all(periodId) as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Tx in period A');
  });

  it('retrieves transactions filtered by type', () => {
    seedTransaction(db, periodId, { type: 'cash', title: 'Cash tx' });
    seedTransaction(db, periodId, { type: 'credit_expense', title: 'Credit tx' });

    const cashRows = db.prepare('SELECT * FROM transactions WHERE period_id = ? AND type = ?').all(periodId, 'cash') as any[];
    expect(cashRows).toHaveLength(1);
    expect(cashRows[0].title).toBe('Cash tx');
  });

  it('updates a transaction', () => {
    const tx = seedTransaction(db, periodId, { title: 'Before update' });
    db.prepare('UPDATE transactions SET title = ? WHERE id = ?').run('After update', tx.id);
    const found = db.prepare('SELECT * FROM transactions WHERE id = ?').get(tx.id) as any;
    expect(found.title).toBe('After update');
  });

  it('deletes a transaction', () => {
    const tx = seedTransaction(db, periodId);
    db.prepare('DELETE FROM transactions WHERE id = ?').run(tx.id);
    const found = db.prepare('SELECT * FROM transactions WHERE id = ?').get(tx.id);
    expect(found).toBeUndefined();
  });

  it('bulk deletes transactions', () => {
    const tx1 = seedTransaction(db, periodId);
    const tx2 = seedTransaction(db, periodId);
    const ids = [tx1.id, tx2.id];
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`).run(...ids);
    const remaining = db.prepare('SELECT COUNT(*) as cnt FROM transactions').get() as any;
    expect(remaining.cnt).toBe(0);
  });

  it('bulk updates transactions', () => {
    const tx1 = seedTransaction(db, periodId, { done: 0 });
    const tx2 = seedTransaction(db, periodId, { done: 0 });
    const ids = [tx1.id, tx2.id];
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE transactions SET done = 1 WHERE id IN (${placeholders})`).run(...ids);

    const r1 = db.prepare('SELECT done FROM transactions WHERE id = ?').get(tx1.id) as any;
    const r2 = db.prepare('SELECT done FROM transactions WHERE id = ?').get(tx2.id) as any;
    expect(r1.done).toBe(1);
    expect(r2.done).toBe(1);
  });

  it('enforces CHECK constraint on type', () => {
    expect(() => {
      db.prepare(`
        INSERT INTO transactions (period_id, date, title, category, amount, currency, type, payment_method, done)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(periodId, '2026-07-08', 'Bad', 'Food', 100, 'IDR', 'invalid_type', 'Cash', 0);
    }).toThrow();
  });

  it('normalizes done boolean to integer', () => {
    db.prepare(`
      INSERT INTO transactions (period_id, date, title, category, amount, currency, type, payment_method, done)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(periodId, '2026-07-08', 'Boolean test', 'Food', 100, 'IDR', 'cash', 'Cash', 1);

    const row = db.prepare('SELECT typeof(done) as t, done FROM transactions').get() as any;
    expect(row.t).toBe('integer');
    expect(row.done).toBe(1);
  });

  it('finds duplicate transactions within 24h', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO transactions (period_id, date, title, category, amount, currency, type, payment_method, done, created_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(periodId, '2026-07-08', 'Grab', 'Transport', 35000, 'IDR', 'cash', 'GoPay', 1, now);

    const dup = db.prepare(`
      SELECT id FROM transactions
      WHERE title = ? AND amount = ? AND category = ? AND type = ? AND created_time > ?
      LIMIT 1
    `).get('Grab', 35000, 'Transport', 'cash', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as any;

    expect(dup).toBeDefined();
    expect(dup.id).toBeDefined();
  });

  it('does not find duplicate outside 24h window', () => {
    const oldTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO transactions (period_id, date, title, category, amount, currency, type, payment_method, done, created_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(periodId, '2026-07-06', 'Grab', 'Transport', 35000, 'IDR', 'cash', 'GoPay', 1, oldTime);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const dup = db.prepare(`
      SELECT id FROM transactions
      WHERE title = ? AND amount = ? AND category = ? AND type = ? AND created_time > ?
      LIMIT 1
    `).get('Grab', 35000, 'Transport', 'cash', since24h);

    expect(dup).toBeUndefined();
  });
});

describe('DB — Categories CRUD', () => {
  let db: any, cleanup: () => void;

  beforeEach(() => {
    const t = createTestDb();
    db = t.db;
    cleanup = t.cleanup;
  });

  afterEach(() => cleanup());

  it('inserts and retrieves a category', () => {
    const cat = seedCategory(db, 'Food', '#ef4444', 500000);
    expect(cat.id).toBeDefined();
    expect(cat.name).toBe('Food');
    expect(cat.monthly_limit).toBe(500000);
  });

  it('rejects duplicate category name', () => {
    seedCategory(db, 'Food');
    expect(() => seedCategory(db, 'Food')).toThrow();
  });

  it('updates a category', () => {
    const cat = seedCategory(db, 'Food', '#ef4444');
    db.prepare('UPDATE categories SET monthly_limit = ?, color = ? WHERE id = ?').run(1000000, '#22c55e', cat.id);
    const found = db.prepare('SELECT * FROM categories WHERE id = ?').get(cat.id) as any;
    expect(found.monthly_limit).toBe(1000000);
    expect(found.color).toBe('#22c55e');
  });

  it('deletes a category', () => {
    const cat = seedCategory(db, 'Food');
    db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id);
    const found = db.prepare('SELECT * FROM categories WHERE id = ?').get(cat.id);
    expect(found).toBeUndefined();
  });

  it('finds category by name (case insensitive)', () => {
    seedCategory(db, 'Food');
    const found = db.prepare("SELECT * FROM categories WHERE name = ? COLLATE NOCASE").get('FOOD') as any;
    expect(found).toBeDefined();
    expect(found.name).toBe('Food');
  });
});

describe('DB — Networth CRUD', () => {
  let db: any, cleanup: () => void;
  let periodId: number;

  beforeEach(() => {
    const t = createTestDb();
    db = t.db;
    cleanup = t.cleanup;
    const p = seedPeriod(db);
    periodId = p.id;
  });

  afterEach(() => cleanup());

  it('inserts and retrieves networth with breakdown', () => {
    db.prepare(`
      INSERT INTO networth (period_id, date, total, currency, month_over_month_change, month_over_month_pct)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(periodId, '2026-07-20', 50000000, 'IDR', 2000000, 4.2);

    db.prepare('INSERT INTO networth_breakdown (period_id, investment, value) VALUES (?, ?, ?)')
      .run(periodId, 'Stocks', 30000000);
    db.prepare('INSERT INTO networth_breakdown (period_id, investment, value) VALUES (?, ?, ?)')
      .run(periodId, 'Crypto', 20000000);

    const nw = db.prepare('SELECT * FROM networth WHERE period_id = ?').get(periodId) as any;
    expect(nw.total).toBe(50000000);
    expect(nw.month_over_month_pct).toBeCloseTo(4.2);

    const breakdown = db.prepare('SELECT * FROM networth_breakdown WHERE period_id = ? ORDER BY investment ASC').all(periodId) as any[];
    expect(breakdown).toHaveLength(2);
    expect(breakdown.map((b: any) => b.investment)).toEqual(['Crypto', 'Stocks']);
  });

  it('upserts networth (update existing)', () => {
    db.prepare('INSERT INTO networth (period_id, date, total, currency) VALUES (?, ?, ?, ?)')
      .run(periodId, '2026-07-20', 50000000, 'IDR');

    db.prepare('UPDATE networth SET total = ? WHERE period_id = ?').run(55000000, periodId);

    const nw = db.prepare('SELECT * FROM networth WHERE period_id = ?').get(periodId) as any;
    expect(nw.total).toBe(55000000);
  });

  it('deletes networth and its breakdown (manual cascade)', () => {
    db.prepare('INSERT INTO networth (period_id, date, total, currency) VALUES (?, ?, ?, ?)')
      .run(periodId, '2026-07-20', 50000000, 'IDR');
    db.prepare('INSERT INTO networth_breakdown (period_id, investment, value) VALUES (?, ?, ?)')
      .run(periodId, 'Stocks', 30000000);

    // App manually cascades — same pattern as upsertNetworth in db.ts
    db.prepare('DELETE FROM networth_breakdown WHERE period_id = ?').run(periodId);
    db.prepare('DELETE FROM networth WHERE period_id = ?').run(periodId);

    const nw = db.prepare('SELECT * FROM networth WHERE period_id = ?').get(periodId);
    expect(nw).toBeUndefined();

    const bd = db.prepare('SELECT * FROM networth_breakdown WHERE period_id = ?').all(periodId);
    expect(bd).toHaveLength(0);
  });
});

describe('DB — Monthly Income', () => {
  let db: any, cleanup: () => void;
  let periodId: number;

  beforeEach(() => {
    const t = createTestDb();
    db = t.db;
    cleanup = t.cleanup;
    const p = seedPeriod(db);
    periodId = p.id;
  });

  afterEach(() => cleanup());

  it('inserts and retrieves monthly income', () => {
    db.prepare('INSERT INTO monthly_income (period_id, date, income, other_income) VALUES (?, ?, ?, ?)')
      .run(periodId, '2026-07-01', 10000000, 500000);

    const mi = db.prepare('SELECT * FROM monthly_income WHERE period_id = ?').get(periodId) as any;
    expect(mi.income).toBe(10000000);
    expect(mi.other_income).toBe(500000);
  });

  it('upserts monthly income (update existing)', () => {
    db.prepare('INSERT INTO monthly_income (period_id, date, income, other_income) VALUES (?, ?, ?, ?)')
      .run(periodId, '2026-07-01', 10000000, 0);

    db.prepare('UPDATE monthly_income SET income = ? WHERE period_id = ?').run(12000000, periodId);

    const mi = db.prepare('SELECT * FROM monthly_income WHERE period_id = ?').get(periodId) as any;
    expect(mi.income).toBe(12000000);
  });

  it('deletes monthly income', () => {
    db.prepare('INSERT INTO monthly_income (period_id, date, income) VALUES (?, ?, ?)')
      .run(periodId, '2026-07-01', 10000000);
    db.prepare('DELETE FROM monthly_income WHERE period_id = ?').run(periodId);
    const mi = db.prepare('SELECT * FROM monthly_income WHERE period_id = ?').get(periodId);
    expect(mi).toBeUndefined();
  });
});

describe('DB — Recurring Transactions', () => {
  let db: any, cleanup: () => void;

  beforeEach(() => {
    const t = createTestDb();
    db = t.db;
    cleanup = t.cleanup;
  });

  afterEach(() => cleanup());

  it('inserts and retrieves a recurring transaction', () => {
    db.prepare(`
      INSERT INTO recurring_transactions (title, category, amount, type, payment_method, done, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('Netflix', 'Entertainment', 186000, 'credit_expense', 'Credit Card', 0, 1, new Date().toISOString());

    const rows = db.prepare('SELECT * FROM recurring_transactions').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Netflix');
    expect(rows[0].active).toBe(1);
  });

  it('enforces CHECK constraint on recurring type', () => {
    expect(() => {
      db.prepare(`
        INSERT INTO recurring_transactions (title, category, amount, type, payment_method, done, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('Bad', 'Cat', 100, 'invalid', 'Cash', 0, 1, new Date().toISOString());
    }).toThrow();
  });
});

describe('DB — Goals', () => {
  let db: any, cleanup: () => void;

  beforeEach(() => {
    const t = createTestDb();
    db = t.db;
    cleanup = t.cleanup;
  });

  afterEach(() => cleanup());

  it('inserts and retrieves a goal', () => {
    db.prepare(`
      INSERT INTO goals (name, description, target_amount, current_amount, start_date, target_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Emergency Fund', '3 months expenses', 50000000, 15000000, '2026-01-01', '2026-12-31');

    const goal = db.prepare('SELECT * FROM goals').get() as any;
    expect(goal.name).toBe('Emergency Fund');
    expect(goal.target_amount).toBe(50000000);
    expect(goal.completed).toBe(0);
  });

  it('enforces CHECK constraint on investment type', () => {
    expect(() => {
      db.prepare(`
        INSERT INTO investments (name, ticker, type, quantity, avg_purchase_price, current_price, purchase_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('Bad Inv', 'BAD', 'not_real_type', 10, 100, 150, '2026-01-01');
    }).toThrow();
  });
});
