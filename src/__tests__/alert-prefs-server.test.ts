import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * FIN-022 lanjutan (KUR-132 ruling) — alert prefs + budget-family alert
 * classification.
 *
 * db.ts connects to the real data/financial.db at import time, so:
 *  - pure rules (classifyBudgetAlert / anomalyPrefFamily) are tested directly;
 *  - getActiveAlertCount is exercised through a structural mirror that calls
 *    the SAME classifyBudgetAlert rule (single source of truth) against an
 *    isolated createTestDb() database;
 *  - the AlertsPanel budget memo is mirrored line-for-line (also calling the
 *    shared rule) to pin server/client parity — the SSR badge and the
 *    hydrated list must agree (AC-8, test #4).
 */

import {
  classifyBudgetAlert,
  anomalyPrefFamily,
  ALERT_PREF_KEYS,
  DEFAULT_ALERT_PREFS,
} from '../lib/alertRules';
import { createTestDb, seedPeriod, seedCategory, seedTransaction } from './helpers';
import type Database from 'better-sqlite3';

// ─── Pure rules ──────────────────────────────────────────────────────────────

describe('alertRules — classifyBudgetAlert (shared server/client rule)', () => {
  it('returns null below 80% of the limit', () => {
    expect(classifyBudgetAlert(399_999, 500_000, false)).toBeNull();
    expect(classifyBudgetAlert(300_000, 500_000, false)).toBeNull();
  });

  it('classifies the 80–99% band as budget_approaching', () => {
    expect(classifyBudgetAlert(400_000, 500_000, false)?.family).toBe('budget_approaching');
    expect(classifyBudgetAlert(495_000, 500_000, false)?.family).toBe('budget_approaching');
  });

  it('classifies >100% as budget_over (even when all recurring)', () => {
    expect(classifyBudgetAlert(600_000, 500_000, true)?.family).toBe('budget_over');
  });

  it('skips approaching when ALL spend is recurring; over-limit still alerts', () => {
    expect(classifyBudgetAlert(450_000, 500_000, true)).toBeNull();
    expect(classifyBudgetAlert(600_000, 500_000, true)?.family).toBe('budget_over');
  });

  it('ignores zero/negative limits and zero spend', () => {
    expect(classifyBudgetAlert(600_000, 0, false)).toBeNull();
    expect(classifyBudgetAlert(0, 500_000, false)).toBeNull();
    expect(classifyBudgetAlert(-5, 500_000, false)).toBeNull();
  });

  it('treats exactly 100% as approaching (over means strictly greater)', () => {
    expect(classifyBudgetAlert(500_000, 500_000, false)?.family).toBe('budget_approaching');
  });
});

describe('alertRules — anomalyPrefFamily (KUR-132 §3: no outlier toggle)', () => {
  it('maps produced reasons to their families', () => {
    expect(anomalyPrefFamily('amount_spike')).toBe('anomaly_amount_spike');
    expect(anomalyPrefFamily('new_merchant')).toBe('anomaly_new_merchant');
  });

  it('returns null for category_outlier (never produced by getAnomalies)', () => {
    expect(anomalyPrefFamily('category_outlier')).toBeNull();
  });

  it('exposes exactly the four ruling families, all ON by default', () => {
    expect(ALERT_PREF_KEYS).toEqual([
      'budget_over',
      'budget_approaching',
      'anomaly_amount_spike',
      'anomaly_new_merchant',
    ]);
    expect(Object.values(DEFAULT_ALERT_PREFS).every(Boolean)).toBe(true);
  });
});

// ─── Server count against an isolated DB ─────────────────────────────────────

type CatTotals = Record<string, number>;

/**
 * Structural mirror of getActiveAlertCount's BUDGET path. It calls the shared
 * classifyBudgetAlert() rule — the same function db.ts uses — against an
 * isolated test DB, honoring prefs/dismissals exactly like db.ts.
 */
function budgetAlertCount(
  db: Database.Database,
  periodId: number,
  prefs: Record<string, boolean>,
  dismissed: Set<string> = new Set(),
): number {
  const rows = db
    .prepare(
      `SELECT t.category AS cat, t.title AS title, t.amount AS amount
       FROM transactions t
       WHERE t.period_id = ? AND t.done = 1
         AND t.type IN ('cash', 'credit_expense')`,
    )
    .all(periodId) as { cat: string; title: string; amount: number }[];

  const limits: Record<string, number> = {};
  for (const c of db.prepare('SELECT name, monthly_limit FROM categories').all() as any[]) {
    if (c.monthly_limit > 0) limits[c.name] = c.monthly_limit;
  }
  const recurringSet = new Set(
    (db.prepare('SELECT title FROM recurring_transactions WHERE active = 1').all() as any[]).map(
      (r) => String(r.title).toLowerCase(),
    ),
  );

  const totals: CatTotals = {};
  const disc: Record<string, number> = {};
  for (const t of rows) {
    totals[t.cat] = (totals[t.cat] || 0) + t.amount;
    if (!recurringSet.has(t.title.toLowerCase())) {
      disc[t.cat] = (disc[t.cat] || 0) + t.amount;
    }
  }

  let count = 0;
  for (const [cat, total] of Object.entries(totals)) {
    const limit = limits[cat];
    if (!limit) continue;
    const cls = classifyBudgetAlert(total, limit, (disc[cat] ?? 0) === 0);
    if (!cls) continue;
    if (!prefs[cls.family]) continue;
    if (dismissed.has(`${periodId}:${cat}`)) continue;
    count++;
  }
  return count;
}

const ALL_ON = { ...DEFAULT_ALERT_PREFS } as Record<string, boolean>;

describe('server budget count — prefs + approaching band (KUR-132 §2+§3)', () => {
  it('empty alert_prefs table behaves identically to baseline (spec test #1)', () => {
    const { db, cleanup } = createTestDb();
    try {
      // Table exists but has zero rows (initSchema never seeds).
      const n = (db.prepare('SELECT COUNT(*) AS n FROM alert_prefs').get() as any).n;
      expect(n).toBe(0);

      const p = seedPeriod(db, 'July 2026');
      seedCategory(db, 'Food', '#ef4444', 500_000);
      seedTransaction(db, p.id, { category: 'Food', amount: 600_000, type: 'cash', done: 1 });
      seedCategory(db, 'Drink', '#a855f7', 400_000);
      seedTransaction(db, p.id, { category: 'Drink', amount: 360_000, type: 'cash', done: 1 });

      expect(budgetAlertCount(db, p.id, ALL_ON)).toBe(2);
    } finally {
      cleanup();
    }
  });

  it('approaching band counts server-side under the same recurring rule (AC-8 fix)', () => {
    const { db, cleanup } = createTestDb();
    try {
      const p = seedPeriod(db, 'July 2026');
      // 93% discretionary → approaching alert.
      seedCategory(db, 'Belanja Pribadi', '#f59e0b', 1_000_000);
      seedTransaction(db, p.id, { category: 'Belanja Pribadi', amount: 930_000, type: 'cash', done: 1 });
      // 100% all-recurring → approaching alert suppressed, like the client.
      seedCategory(db, 'Tagihan', '#ef4444', 1_000_000);
      seedTransaction(db, p.id, { title: 'Listrik', category: 'Tagihan', amount: 1_000_000, type: 'cash', done: 1 });
      db.prepare(
        "INSERT INTO recurring_transactions (title, category, amount, type, active) VALUES (?, ?, ?, 'cash', 1)",
      ).run('Listrik', 'Tagihan', 1_000_000);

      expect(budgetAlertCount(db, p.id, ALL_ON)).toBe(1);
    } finally {
      cleanup();
    }
  });

  it('each family toggle reduces the count independently (spec test #2/#5)', () => {
    const { db, cleanup } = createTestDb();
    try {
      const p = seedPeriod(db, 'July 2026');
      seedCategory(db, 'Food', '#ef4444', 500_000);
      seedTransaction(db, p.id, { category: 'Food', amount: 600_000, type: 'cash', done: 1 });
      seedCategory(db, 'Drink', '#a855f7', 400_000);
      seedTransaction(db, p.id, { category: 'Drink', amount: 360_000, type: 'cash', done: 1 });

      expect(budgetAlertCount(db, p.id, ALL_ON)).toBe(2);
      expect(budgetAlertCount(db, p.id, { ...ALL_ON, budget_over: false })).toBe(1);
      expect(budgetAlertCount(db, p.id, { ...ALL_ON, budget_approaching: false })).toBe(1);
      expect(budgetAlertCount(db, p.id, { ...ALL_ON, budget_over: false, budget_approaching: false })).toBe(0);
    } finally {
      cleanup();
    }
  });

  it('dismissed budget keys stop counting per family-agnostic key', () => {
    const { db, cleanup } = createTestDb();
    try {
      const p = seedPeriod(db, 'July 2026');
      seedCategory(db, 'Food', '#ef4444', 500_000);
      seedTransaction(db, p.id, { category: 'Food', amount: 600_000, type: 'cash', done: 1 });

      const dismissed = new Set([`${p.id}:Food`]);
      expect(budgetAlertCount(db, p.id, ALL_ON, dismissed)).toBe(0);
    } finally {
      cleanup();
    }
  });
});

// ─── Client parity mirror (AlertsPanel budget memo, line-for-line) ──────────

/**
 * Mirror of the AlertsPanel budgetAlerts memo AFTER this change: it consumes
 * the shared classifyBudgetAlert() rule and the prefs map, so any divergence
 * between the SSR badge and the hydrated client list fails here.
 */
function clientBudgetAlerts(
  db: Database.Database,
  periodId: number,
  categoryTotals: CatTotals,
  prefs: Record<string, boolean>,
  dismissed: Set<string>,
): { cat: string; family: string }[] {
  const limits: Record<string, number> = {};
  for (const c of db.prepare('SELECT name, monthly_limit FROM categories').all() as any[]) {
    if (c.monthly_limit > 0) limits[c.name] = c.monthly_limit;
  }
  const recurringSet = new Set(
    (db.prepare('SELECT title FROM recurring_transactions WHERE active = 1').all() as any[]).map(
      (r) => String(r.title).toLowerCase(),
    ),
  );
  const rows = db
    .prepare(
      `SELECT category, title, amount FROM transactions
       WHERE period_id = ? AND done = 1 AND type IN ('cash', 'credit_expense')`,
    )
    .all(periodId) as { category: string; title: string; amount: number }[];
  const disc: Record<string, number> = {};
  for (const t of rows) {
    if (!recurringSet.has(t.title.toLowerCase())) {
      disc[t.category] = (disc[t.category] || 0) + t.amount;
    }
  }

  const out: { cat: string; family: string }[] = [];
  for (const [cat, amount] of Object.entries(categoryTotals)) {
    const limit = limits[cat] ?? 0;
    const cls = classifyBudgetAlert(amount, limit, (disc[cat] ?? 0) === 0);
    if (!cls) continue;
    if (!prefs[cls.family]) continue;
    if (dismissed.has(`${periodId}:${cat}`)) continue;
    out.push({ cat, family: cls.family });
  }
  return out;
}

describe('SSR badge ↔ client list parity (AC-8 regression, spec test #4)', () => {
  it('badge equals hydrated client count with an active approaching band + mixed prefs', () => {
    const { db, cleanup } = createTestDb();
    try {
      const p = seedPeriod(db, 'July 2026');
      // Live production shape (period 44): 1 over + 3 approaching in-band.
      seedCategory(db, 'Belanja Pribadi', '#f59e0b', 1_000_000);
      seedTransaction(db, p.id, { category: 'Belanja Pribadi', amount: 930_000, type: 'cash', done: 1 });
      seedCategory(db, 'Family', '#22c55e', 1_000_000);
      seedTransaction(db, p.id, { category: 'Family', amount: 880_000, type: 'cash', done: 1 });
      seedCategory(db, 'Tagihan', '#ef4444', 1_000_000);
      seedTransaction(db, p.id, { category: 'Tagihan', amount: 1_000_000, type: 'cash', done: 1 }); // 100%, discretionary
      seedCategory(db, 'Food', '#ef4444', 500_000);
      seedTransaction(db, p.id, { category: 'Food', amount: 600_000, type: 'cash', done: 1 }); // over

      const totals: CatTotals = {
        'Belanja Pribadi': 930_000,
        Family: 880_000,
        Tagihan: 1_000_000,
        Food: 600_000,
      };

      // All ON — badge (server) and list (client) must both see 4.
      const server = budgetAlertCount(db, p.id, ALL_ON);
      const client = clientBudgetAlerts(db, p.id, totals, ALL_ON, new Set());
      expect(server).toBe(4);
      expect(client.length).toBe(server);

      // Mixed prefs — the SAME filtered set on both sides.
      const mixed = { ...ALL_ON, budget_approaching: false, anomaly_new_merchant: false };
      const serverMixed = budgetAlertCount(db, p.id, mixed);
      const clientMixed = clientBudgetAlerts(db, p.id, totals, mixed, new Set());
      expect(serverMixed).toBe(1);
      expect(clientMixed.length).toBe(serverMixed);
      expect(clientMixed[0].family).toBe('budget_over');

      // Toggle OFF→ON restores the same alerts (spec test #3: prefs = view filter).
      const restored = clientBudgetAlerts(db, p.id, totals, ALL_ON, new Set());
      expect(restored.length).toBe(4);
    } finally {
      cleanup();
    }
  });

  it('prefs OFF never touches alert_state (dismissals unaffected by toggles)', () => {
    const { db, cleanup } = createTestDb();
    try {
      const p = seedPeriod(db, 'July 2026');
      seedCategory(db, 'Food', '#ef4444', 500_000);
      seedTransaction(db, p.id, { category: 'Food', amount: 600_000, type: 'cash', done: 1 });

      // Simulate a dismissed alert + prefs off — independent mechanisms.
      db.prepare('INSERT INTO alert_state (alert_key, dismissed_at) VALUES (?, ?)').run(
        `${p.id}:Food`,
        '2026-10-07T00:00:00Z',
      );
      const dismissed = new Set([`${p.id}:Food`]);
      const prefsOff = { ...ALL_ON, budget_over: false };

      expect(budgetAlertCount(db, p.id, prefsOff, dismissed)).toBe(0);
      // Row count unchanged by any pref filtering.
      const n = (db.prepare('SELECT COUNT(*) AS n FROM alert_state').get() as any).n;
      expect(n).toBe(1);
      const prefRows = (db.prepare('SELECT COUNT(*) AS n FROM alert_prefs').get() as any).n;
      expect(prefRows).toBe(0);
    } finally {
      cleanup();
    }
  });
});

// ─── Store-level pref semantics (spec tests #2/#3/#6, client side) ──────────

describe('alertsStore prefs semantics', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('setAlertPrefShared publishes optimistically, PATCHes once, rolls back on failure', async () => {
    vi.resetModules();
    const calls: { url: string; init?: RequestInit }[] = [];
    globalThis.fetch = ((url: any, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return Promise.reject(new Error('server down'));
    }) as any;

    const store = await import('../lib/alertsStore');
    store.resetAlertsState();

    store.setAlertPrefShared('budget_approaching', false);
    expect(store.getAlertsState().prefs.budget_approaching).toBe(false);

    await Promise.resolve();
    await Promise.resolve();

    expect(calls.length).toBe(1);
    expect(calls[0].init?.method).toBe('PATCH');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      pref: 'budget_approaching',
      enabled: false,
    });
    // Rollback (spec: failed set pref → rollback optimistic).
    expect(store.getAlertsState().prefs.budget_approaching).toBe(true);
    // Exactly one network write, and it is the pref PATCH — no dismissal
    // (alert_state) traffic, no localStorage mirror (KUR-132 §2).
    expect(
      calls.some((c) => c.init?.method === 'POST' || c.init?.method === 'DELETE'),
    ).toBe(false);
  });

  it('GET failure keeps prefs all-ON and never empties the list (spec test #6)', async () => {
    vi.resetModules();
    globalThis.fetch = (() => Promise.reject(new Error('server down'))) as any;
    const store = await import('../lib/alertsStore');
    store.resetAlertsState();

    store.ensureAlertStateLoaded();
    await Promise.resolve();
    await Promise.resolve();

    expect(Object.values(store.getAlertsState().prefs).every(Boolean)).toBe(true);
  });
});
