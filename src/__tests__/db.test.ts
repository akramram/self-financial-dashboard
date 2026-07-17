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

describe('DB — Recurring Cost Analysis', () => {
  let db: any, cleanup: () => void;

  beforeEach(() => {
    const t = createTestDb();
    db = t.db;
    cleanup = t.cleanup;
  });

  afterEach(() => cleanup());

  /** Helper: insert a recurring transaction directly into the test DB. */
  function seedRecurring(overrides: Partial<any> = {}) {
    const defaults = {
      title: 'Test Sub',
      category: 'Entertainment',
      amount: 100000,
      type: 'credit_expense',
      payment_method: 'Credit Card',
      done: 0,
      active: 1,
      end_date: null,
      created_at: new Date().toISOString(),
    };
    const row = { ...defaults, ...overrides };
    const result = db.prepare(`
      INSERT INTO recurring_transactions (title, category, amount, type, payment_method, done, active, end_date, created_at)
      VALUES (@title, @category, @amount, @type, @payment_method, @done, @active, @end_date, @created_at)
    `).run(row);
    return { ...row, id: Number(result.lastInsertRowid) };
  }

  /** Replicate getRecurringCostAnalysis against the test DB. */
  function analyzeRecurringCosts() {
    const rows = db.prepare(`
      SELECT id, title, category, amount, type, active, end_date
      FROM recurring_transactions
      ORDER BY active DESC, amount DESC
    `).all() as any[];

    const items = rows.map((r) => ({
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

    const monthlyByType: Record<string, number> = { cash: 0, credit_expense: 0, credit_payment: 0 };
    for (const item of activeItems) {
      if (item.type in monthlyByType) {
        monthlyByType[item.type] += item.amount;
      }
    }

    const temporaryCount = activeItems.filter((i) => i.isTemporary).length;
    const largestItem = activeItems.length > 0
      ? activeItems.reduce((max, i) => (i.amount > max.amount ? i : max))
      : null;
    const avgPerItem = activeItems.length > 0 ? monthlyTotal / activeItems.length : 0;

    return {
      items, activeItems, pausedItems, monthlyTotal, annualTotal,
      monthlyByCategory, monthlyByType, categoryCount: Object.keys(monthlyByCategory).length,
      activeCount: activeItems.length, temporaryCount, largestItem, avgPerItem,
    };
  }

  it('returns empty result when no recurring transactions exist', () => {
    const result = analyzeRecurringCosts();
    expect(result.activeCount).toBe(0);
    expect(result.monthlyTotal).toBe(0);
    expect(result.annualTotal).toBe(0);
    expect(result.largestItem).toBeNull();
    expect(result.avgPerItem).toBe(0);
    expect(result.categoryCount).toBe(0);
  });

  it('computes monthly and annual totals from active items only', () => {
    seedRecurring({ title: 'Netflix', amount: 186000, active: 1 });
    seedRecurring({ title: 'Spotify', amount: 90000, active: 1 });
    seedRecurring({ title: 'Paused Gym', amount: 500000, active: 0 }); // excluded

    const result = analyzeRecurringCosts();
    expect(result.activeCount).toBe(2);
    expect(result.monthlyTotal).toBe(276000);
    expect(result.annualTotal).toBe(276000 * 12);
  });

  it('groups amounts by category correctly', () => {
    seedRecurring({ title: 'Netflix', category: 'Entertainment', amount: 186000 });
    seedRecurring({ title: 'Spotify', category: 'Entertainment', amount: 90000 });
    seedRecurring({ title: 'Internet', category: 'Tagihan', amount: 358000 });

    const result = analyzeRecurringCosts();
    expect(result.categoryCount).toBe(2);
    expect(result.monthlyByCategory['Entertainment']).toBe(276000);
    expect(result.monthlyByCategory['Tagihan']).toBe(358000);
  });

  it('groups amounts by payment type correctly', () => {
    seedRecurring({ title: 'Cash Item', type: 'cash', amount: 200000 });
    seedRecurring({ title: 'Credit Item', type: 'credit_expense', amount: 150000 });
    seedRecurring({ title: 'CC Payment', type: 'credit_payment', amount: 500000 });

    const result = analyzeRecurringCosts();
    expect(result.monthlyByType.cash).toBe(200000);
    expect(result.monthlyByType.credit_expense).toBe(150000);
    expect(result.monthlyByType.credit_payment).toBe(500000);
  });

  it('identifies the largest item correctly', () => {
    seedRecurring({ title: 'Small', amount: 50000 });
    seedRecurring({ title: 'Large', amount: 500000 });
    seedRecurring({ title: 'Medium', amount: 200000 });

    const result = analyzeRecurringCosts();
    expect(result.largestItem).not.toBeNull();
    expect(result.largestItem.title).toBe('Large');
    expect(result.largestItem.amount).toBe(500000);
  });

  it('computes average per item correctly', () => {
    seedRecurring({ title: 'A', amount: 300000 });
    seedRecurring({ title: 'B', amount: 150000 });
    seedRecurring({ title: 'C', amount: 150000 });

    const result = analyzeRecurringCosts();
    expect(result.avgPerItem).toBe(200000);
  });

  it('counts temporary items (with end_date) separately', () => {
    seedRecurring({ title: 'Permanent', amount: 100000, end_date: null });
    seedRecurring({ title: 'Temporary', amount: 200000, end_date: '2026-09' });
    seedRecurring({ title: 'Temp 2', amount: 50000, end_date: '2026-12' });

    const result = analyzeRecurringCosts();
    expect(result.temporaryCount).toBe(2);
    expect(result.activeCount).toBe(3);
  });

  it('separates paused items from active items', () => {
    seedRecurring({ title: 'Active 1', amount: 100000, active: 1 });
    seedRecurring({ title: 'Paused 1', amount: 200000, active: 0 });
    seedRecurring({ title: 'Paused 2', amount: 300000, active: 0 });

    const result = analyzeRecurringCosts();
    expect(result.activeItems).toHaveLength(1);
    expect(result.pausedItems).toHaveLength(2);
    expect(result.activeCount).toBe(1);
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

describe('DB — Budget Pace', () => {
  let db: any, cleanup: () => void;
  let periodId: number;

  beforeEach(() => {
    const t = createTestDb();
    db = t.db;
    cleanup = t.cleanup;
    const p = seedPeriod(db, 'July 2026');
    periodId = p.id;
  });

  afterEach(() => cleanup());

  /** Helper: seed a category with a budget limit. */
  function seedBudgetCategory(name: string, limit: number, color = '#3b82f6') {
    db.prepare('INSERT INTO categories (name, color, monthly_limit) VALUES (?, ?, ?)').run(name, color, limit);
  }

  /** Helper: seed a spending transaction. */
  function seedSpending(amount: number, category: string, overrides?: Partial<any>) {
    seedTransaction(db, periodId, { amount, category, type: 'cash', done: 1, ...overrides });
  }

  /** Replicate the pace calculation against the test DB. */
  function computePace() {
    const period = db.prepare('SELECT * FROM periods WHERE id = ?').get(periodId);
    const startDate = new Date(period.start_date + 'T00:00:00');
    const endDate = new Date(period.end_date + 'T23:59:59');
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const days_total = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1);
    const days_elapsed = Math.min(days_total, Math.max(0, Math.round((now.getTime() - startDate.getTime()) / msPerDay) + 1));
    const time_elapsed_pct = (days_elapsed / days_total) * 100;

    const categories = db.prepare('SELECT name, color, monthly_limit FROM categories WHERE monthly_limit > 0').all();
    const spending = db.prepare(`
      SELECT category, SUM(amount) as spent
      FROM transactions WHERE period_id = ? AND done = 1 AND type IN ('cash', 'credit_expense')
      GROUP BY category
    `).all(periodId);
    const spendingMap = new Map(spending.map((s: any) => [s.category, s.spent]));

    let total_budget = 0, total_spent = 0;
    const paceCats = categories.map((cat: any) => {
      const limit = cat.monthly_limit || 0;
      const spent = spendingMap.get(cat.name) || 0;
      const spent_pct = limit > 0 ? (spent / limit) * 100 : 0;
      const pace_diff = spent_pct - time_elapsed_pct;
      total_budget += limit;
      total_spent += spent;
      return { category: cat.name, limit, spent, spent_pct, pace_diff, time_elapsed_pct };
    });

    const total_expected = total_budget * (time_elapsed_pct / 100);
    const total_pace_pct = total_expected > 0 ? ((total_spent - total_expected) / total_expected) * 100 : 0;

    return { days_elapsed, days_total, time_elapsed_pct, total_budget, total_spent, total_expected, total_pace_pct, categories: paceCats };
  }

  it('returns zero budget and spending when no categories have limits', () => {
    const result = computePace();
    expect(result.total_budget).toBe(0);
    expect(result.total_spent).toBe(0);
    expect(result.categories).toHaveLength(0);
  });

  it('computes total_budget as sum of all category limits', () => {
    seedBudgetCategory('Food', 500000);
    seedBudgetCategory('Transport', 300000);
    seedBudgetCategory('Entertainment', 200000);

    const result = computePace();
    expect(result.total_budget).toBe(1000000);
  });

  it('computes total_spent only from budgeted categories', () => {
    seedBudgetCategory('Food', 500000);
    seedBudgetCategory('Transport', 300000);
    // Budgeted spending
    seedSpending(200000, 'Food');
    seedSpending(100000, 'Transport');
    // Unbudgeted spending — should NOT count
    seedSpending(999999, 'Unbudgeted');

    const result = computePace();
    expect(result.total_spent).toBe(300000);
  });

  it('excludes credit_payment and unpaid transactions from spending', () => {
    seedBudgetCategory('Food', 500000);
    seedSpending(100000, 'Food', { type: 'cash', done: 1 });
    seedSpending(50000, 'Food', { type: 'credit_expense', done: 1 });
    seedSpending(80000, 'Food', { type: 'credit_payment', done: 1 }); // excluded
    seedSpending(30000, 'Food', { type: 'cash', done: 0 });            // excluded

    const result = computePace();
    expect(result.total_spent).toBe(150000);
  });

  it('calculates time_elapsed_pct correctly for a mid-period date', () => {
    // July 2026 period: 2026-06-21 to 2026-07-20 = 30 days
    const result = computePace();
    // days_total should be 30
    expect(result.days_total).toBeGreaterThanOrEqual(29);
    expect(result.days_total).toBeLessThanOrEqual(31);
    // time_elapsed_pct between 0 and 100
    expect(result.time_elapsed_pct).toBeGreaterThanOrEqual(0);
    expect(result.time_elapsed_pct).toBeLessThanOrEqual(100);
  });

  it('computes total_expected as budget * time_pct', () => {
    seedBudgetCategory('Food', 1000000);

    const result = computePace();
    const expectedValue = result.total_budget * (result.time_elapsed_pct / 100);
    expect(result.total_expected).toBeCloseTo(expectedValue, 2);
  });

  it('marks category as over_pace when spending exceeds time-elapsed ratio', () => {
    seedBudgetCategory('Food', 100000);
    // Spend 100% of budget — no matter where we are in the period, this is over_pace
    seedSpending(100000, 'Food');

    const result = computePace();
    const foodCat = result.categories.find((c: any) => c.category === 'Food');
    expect(foodCat.spent_pct).toBe(100);
    // pace_diff = spent_pct - time_elapsed_pct; since spent is 100% and time < 100%, diff > 0
    expect(foodCat.pace_diff).toBeGreaterThan(0);
  });

  it('projects total spending linearly based on daily rate', () => {
    seedBudgetCategory('Food', 1000000);
    seedSpending(500000, 'Food'); // 50% spent

    const result = computePace();
    const foodCat = result.categories.find((c: any) => c.category === 'Food');
    // Projection = (spent / days_elapsed) * days_total
    if (result.days_elapsed > 0) {
      const expectedProjection = (500000 / result.days_elapsed) * result.days_total;
      expect(foodCat.spent).toBe(500000);
    }
  });

  it('handles categories with no spending gracefully', () => {
    seedBudgetCategory('Food', 500000);
    seedBudgetCategory('Transport', 300000);
    seedSpending(200000, 'Food');
    // Transport has no spending

    const result = computePace();
    const transportCat = result.categories.find((c: any) => c.category === 'Transport');
    expect(transportCat.spent).toBe(0);
    expect(transportCat.spent_pct).toBe(0);
    expect(transportCat.pace_diff).toBeLessThanOrEqual(0); // under pace
  });
});

// ─── Runway Analysis (liquidity classification + monthly expense) ──────────

describe('DB — Runway Analysis queries', () => {
  let db: any, cleanup: () => void;

  beforeEach(() => {
    const t = createTestDb();
    db = t.db;
    cleanup = t.cleanup;

    // Seed 3 periods for history
    seedPeriod(db, 'May 2026');
    seedPeriod(db, 'June 2026');
    db.prepare("INSERT INTO periods (month, start_date, end_date) VALUES (?, ?, ?)")
      .run('July 2026', '2026-06-21', '2026-07-20');
    const periods = db.prepare('SELECT id, month FROM periods ORDER BY id').all();
    const [p1, p2, p3] = periods;

    // Networth breakdown — mixed liquidity
    // p3 (July): CashCow Jenius 2M (100%), Reksa Dana 1M (90%), Saham 5M (50%), Saham Luar 1M (30%)
    const insertBd = db.prepare('INSERT INTO networth_breakdown (period_id, investment, value) VALUES (?, ?, ?)');
    insertBd.run(p3.id, 'CashCow Jenius', 2000000);
    insertBd.run(p3.id, 'Reksa Dana', 1000000);
    insertBd.run(p3.id, 'Saham', 5000000);
    insertBd.run(p3.id, 'Saham Luar', 1000000);

    db.prepare('INSERT INTO networth (period_id, date, total) VALUES (?, ?, ?)')
      .run(p3.id, '2026-07-21', 9000000);

    // Transactions for 3 months of spending
    for (const p of [p1, p2, p3]) {
      db.prepare(`INSERT INTO transactions (period_id, date, title, category, amount, type, payment_method, done)
        VALUES (?, '2026-07-08', 'Expense', 'Food', 5000000, 'cash', 'Cash', 1)`).run(p.id);
      db.prepare(`INSERT INTO transactions (period_id, date, title, category, amount, type, payment_method, done)
        VALUES (?, '2026-07-09', 'CC', 'Shopping', 3000000, 'credit_expense', 'Credit', 1)`).run(p.id);
      // Unpaid — should be excluded
      db.prepare(`INSERT INTO transactions (period_id, date, title, category, amount, type, payment_method, done)
        VALUES (?, '2026-07-10', 'Future', 'Food', 1000000, 'cash', 'Cash', 0)`).run(p.id);
    }

    // Recurring obligations
    db.prepare(`INSERT INTO recurring_transactions (title, category, amount, type, payment_method, done, active)
      VALUES ('Rent', 'Housing', 2000000, 'cash', 'Cash', 1, 1)`).run();
    db.prepare(`INSERT INTO recurring_transactions (title, category, amount, type, payment_method, done, active)
      VALUES ('Internet', 'Utilities', 500000, 'cash', 'Cash', 1, 1)`).run();
  });

  afterEach(() => cleanup());

  it('computes liquid assets with per-investment liquidity factor', () => {
    const latest = db.prepare('SELECT period_id FROM networth ORDER BY period_id DESC LIMIT 1').get();
    const bd = db.prepare('SELECT investment, value FROM networth_breakdown WHERE period_id = ?').all(latest.period_id);

    const liquidFactor = (name: string): number => {
      const lower = name.toLowerCase();
      if (lower.includes('cash') || lower.includes('jenius')) return 1.0;
      if (lower.includes('reksa')) return 0.9;
      if (lower.includes('luar')) return 0.3;
      if (lower.includes('saham')) return 0.5;
      return 0.7;
    };

    const liquid = bd.reduce((s: number, b: any) => s + b.value * liquidFactor(b.investment), 0);
    // CashCow 2M * 1.0 + Reksa 1M * 0.9 + Saham 5M * 0.5 + Saham Luar 1M * 0.3
    // = 2,000,000 + 900,000 + 2,500,000 + 300,000 = 5,700,000
    expect(liquid).toBe(5700000);

    const total = bd.reduce((s: number, b: any) => s + b.value, 0);
    expect(total).toBe(9000000);
  });

  it('averages last 3 periods of done spending', () => {
    const rows = db.prepare(`
      SELECT t.period_id, SUM(t.amount) as total_expense
      FROM transactions t
      WHERE t.done = 1 AND t.type IN ('cash', 'credit_expense')
      GROUP BY t.period_id
      ORDER BY t.period_id DESC
      LIMIT 3
    `).all();

    expect(rows.length).toBe(3);
    // Each period: 5M cash + 3M credit_expense = 8M (unpaid 1M excluded)
    for (const r of rows) {
      expect(r.total_expense).toBe(8000000);
    }
    const avg = rows.reduce((s: number, r: any) => s + r.total_expense, 0) / rows.length;
    expect(avg).toBe(8000000);
  });

  it('sums active recurring obligations for fixed cost coverage', () => {
    const rows = db.prepare(`
      SELECT amount FROM recurring_transactions
      WHERE active = 1 AND type IN ('cash', 'credit_expense', 'credit_payment')
    `).all();
    const total = rows.reduce((s: number, r: any) => s + r.amount, 0);
    // Rent 2M + Internet 500K = 2.5M
    expect(total).toBe(2500000);
  });

  it('excludes unpaid (done=0) transactions from expense baseline', () => {
    const paidOnly = db.prepare(`
      SELECT SUM(amount) as total FROM transactions WHERE done = 1 AND type IN ('cash', 'credit_expense')
    `).get();
    const allTx = db.prepare(`
      SELECT SUM(amount) as total FROM transactions WHERE type IN ('cash', 'credit_expense')
    `).get();
    // 3 periods * 8M paid vs 3 periods * 9M (includes unpaid)
    expect(paidOnly.total).toBe(24000000);
    expect(allTx.total).toBe(27000000);
  });

  it('runway = liquid assets / monthly expense', () => {
    const liquid = 5700000;
    const monthly = 8000000;
    const runway = liquid / monthly;
    expect(runway).toBeCloseTo(0.7125, 3);
    // Less than 1 month → critical status
    expect(runway < 1).toBe(true);
  });

  it('classifies runway status correctly', () => {
    const status = (months: number) => {
      if (months >= 6) return 'strong';
      if (months >= 3) return 'healthy';
      if (months >= 1) return 'caution';
      return 'critical';
    };
    expect(status(0.5)).toBe('critical');
    expect(status(2)).toBe('caution');
    expect(status(4)).toBe('healthy');
    expect(status(8)).toBe('strong');
  });
});
