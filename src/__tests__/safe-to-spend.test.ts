/**
 * GET /api/safe-to-spend — unpaid obligations correction (KUR-47, GH #270).
 *
 * Daily Allowance must subtract unpaid obligations in the same period:
 *   unpaidObligations = Σ(done = 0 AND type IN ('cash','credit_payment'))
 * Unpaid credit_expense must NOT count (already recorded when the expense
 * was created — counting it again would double count).
 *
 * The handler imports the shared `db` from lib/db; we swap it for an
 * isolated temp SQLite instance (createTestDb) so tests never touch
 * data/financial.db.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createTestDb, seedTransaction } from './helpers';

let testDb: ReturnType<typeof createTestDb>;

vi.mock('../lib/db', () => ({
  db: {
    prepare: (sql: string) => ({
      get: (...args: unknown[]) => testDb.db.prepare(sql).get(...(args as any[])),
      all: (...args: unknown[]) => testDb.db.prepare(sql).all(...(args as any[])),
    }),
  },
}));

import { GET } from '../pages/api/safe-to-spend';

/** Freeze "now" at 10:00 local so the API's day arithmetic is deterministic. */
const RealDate = Date;
const REAL_NOW = new RealDate();
const FAKE_TODAY = new RealDate(REAL_NOW.getFullYear(), REAL_NOW.getMonth(), REAL_NOW.getDate(), 10, 0, 0);
class FakeDate extends RealDate {
  constructor(...args: [] | [number] | [number, number, number, number?, number?, number?, number?] | [string]) {
    if (args.length === 0) super(FAKE_TODAY.getTime());
    else super(...(args as ConstructorParameters<typeof RealDate>));
  }
  static now() {
    return FAKE_TODAY.getTime();
  }
}

/** Local (not UTC) yyyy-mm-dd — matches how the API derives day boundaries. */
const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Salary-cycle-like period around today: [today−9 … today+1].
 *  With now frozen at 10:00: days_total = 12, days_elapsed = 10, days_remaining = 2. */
function seedWindowPeriod() {
  const start = new RealDate(FAKE_TODAY.getFullYear(), FAKE_TODAY.getMonth(), FAKE_TODAY.getDate() - 9);
  const end = new RealDate(FAKE_TODAY.getFullYear(), FAKE_TODAY.getMonth(), FAKE_TODAY.getDate() + 1);
  testDb.db
    .prepare('INSERT INTO periods (month, start_date, end_date) VALUES (?, ?, ?)')
    .run('Test Window', localISO(start), localISO(end));
  return testDb.db.prepare('SELECT * FROM periods WHERE month = ?').get('Test Window') as any;
}

async function call(periodId: number) {
  const url = new URL(`http://localhost/api/safe-to-spend?period_id=${periodId}`);
  const res = await GET({ url } as any);
  return { status: res.status, body: await res.json() };
}

const INCOME = 1_000_000;
const DAYS_REMAINING = 2; // from the fixed window + frozen clock above

beforeAll(() => {
  testDb = createTestDb();
  vi.stubGlobal('Date', FakeDate);
});

afterAll(() => vi.unstubAllGlobals());

afterEach(() => {
  testDb.db.prepare('DELETE FROM transactions').run();
  testDb.db.prepare('DELETE FROM monthly_income').run();
  testDb.db.prepare('DELETE FROM periods').run();
});

describe('GET /api/safe-to-spend — unpaid obligations', () => {
  it('(a) unpaid cash in the same period reduces the allowance', async () => {
    const p = seedWindowPeriod();
    testDb.db
      .prepare('INSERT INTO monthly_income (period_id, date, income) VALUES (?, ?, ?)')
      .run(p.id, localISO(new Date()), INCOME);
    seedTransaction(testDb.db, p.id, { type: 'cash', done: 1, amount: 100_000 });
    seedTransaction(testDb.db, p.id, { type: 'cash', done: 0, amount: 200_000 });

    const { status, body } = await call(p.id);
    expect(status).toBe(200);
    expect(body.total_spent).toBe(100_000);
    expect(body.unpaid_obligations).toBe(200_000);
    expect(body.remaining_budget).toBe(700_000);
    expect(body.daily_safe_to_spend).toBe(350_000); // 700k / 2
  });

  it('(b) unpaid credit_payment in the same period reduces the allowance', async () => {
    const p = seedWindowPeriod();
    testDb.db
      .prepare('INSERT INTO monthly_income (period_id, date, income) VALUES (?, ?, ?)')
      .run(p.id, localISO(new Date()), INCOME);
    seedTransaction(testDb.db, p.id, {
      type: 'credit_payment', done: 0, amount: 300_000, payment_method: 'Credit Card',
    });

    const { body } = await call(p.id);
    expect(body.unpaid_obligations).toBe(300_000);
    expect(body.remaining_budget).toBe(700_000);
    expect(body.daily_safe_to_spend).toBe(350_000);
  });

  it('(c) unpaid credit_expense does NOT reduce the allowance (no double count)', async () => {
    const p = seedWindowPeriod();
    testDb.db
      .prepare('INSERT INTO monthly_income (period_id, date, income) VALUES (?, ?, ?)')
      .run(p.id, localISO(new Date()), INCOME);
    seedTransaction(testDb.db, p.id, {
      type: 'credit_expense', done: 0, amount: 250_000, payment_method: 'Credit Card',
    });

    const { body } = await call(p.id);
    expect(body.unpaid_obligations).toBe(0);
    expect(body.remaining_budget).toBe(1_000_000);
    expect(body.daily_safe_to_spend).toBe(500_000);
  });

  it('(d) done spending is still counted in full', async () => {
    const p = seedWindowPeriod();
    testDb.db
      .prepare('INSERT INTO monthly_income (period_id, date, income) VALUES (?, ?, ?)')
      .run(p.id, localISO(new Date()), INCOME);
    seedTransaction(testDb.db, p.id, { type: 'cash', done: 1, amount: 400_000 });
    seedTransaction(testDb.db, p.id, {
      type: 'credit_expense', done: 1, amount: 100_000, payment_method: 'Credit Card',
    });

    const { body } = await call(p.id);
    expect(body.total_spent).toBe(500_000);
    expect(body.remaining_budget).toBe(500_000);
    expect(body.daily_safe_to_spend).toBe(250_000);
  });

  it('ignores unpaid obligations from other periods', async () => {
    const p = seedWindowPeriod();
    testDb.db
      .prepare('INSERT INTO monthly_income (period_id, date, income) VALUES (?, ?, ?)')
      .run(p.id, localISO(new Date()), INCOME);
    const other = testDb.db
      .prepare('INSERT INTO periods (month, start_date, end_date) VALUES (?, ?, ?)')
      .run('Other Window', '2020-01-01', '2020-01-31');
    seedTransaction(testDb.db, Number(other.lastInsertRowid), { type: 'cash', done: 0, amount: 999_999 });

    const { body } = await call(p.id);
    expect(body.unpaid_obligations).toBe(0);
    expect(body.remaining_budget).toBe(1_000_000);
    expect(body.daily_safe_to_spend).toBe(500_000);
  });

  it('marks the period over when unpaid obligations exceed income', async () => {
    const p = seedWindowPeriod();
    testDb.db
      .prepare('INSERT INTO monthly_income (period_id, date, income) VALUES (?, ?, ?)')
      .run(p.id, localISO(new Date()), INCOME);
    seedTransaction(testDb.db, p.id, { type: 'cash', done: 0, amount: 1_200_000 });

    const { body } = await call(p.id);
    expect(body.status).toBe('over'); // threshold logic unchanged, budget now negative
    expect(body.remaining_budget).toBe(-200_000);
  });
});
