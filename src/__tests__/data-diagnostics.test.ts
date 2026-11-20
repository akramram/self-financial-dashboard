import { describe, it, expect } from 'vitest';
import { runDataDiagnostics, healthLabel, FIXABLE_CHECKS } from '../lib/data-diagnostics';
import type { DiagTx, DiagPeriod } from '../lib/data-diagnostics';

const NOW = '2026-11-17T10:00:00.000Z';

const periods: DiagPeriod[] = [
  { id: 1, month: 'September 2026', start_date: '2026-09-21', end_date: '2026-10-20' },
  { id: 2, month: 'October 2026', start_date: '2026-10-21', end_date: '2026-11-20' },
];

const categories = [
  { id: 1, name: 'Belanja' },
  { id: 2, name: 'Kuliner' },
];

function tx(overrides: Partial<DiagTx>): DiagTx {
  return {
    id: 1,
    title: 'Kopi',
    amount: 20000,
    type: 'cash',
    category: 'Kuliner',
    done: 1,
    date: '2026-10-21',
    created_time: '2026-10-21T12:00:00.000Z',
    period_id: 2,
    ...overrides,
  };
}

function run(txs: DiagTx[], extra: Partial<Parameters<typeof runDataDiagnostics>[0]> = {}) {
  return runDataDiagnostics({
    transactions: txs,
    periods,
    categories,
    activePeriodId: 2,
    now: NOW,
    ...extra,
  });
}

function findingOf(report: ReturnType<typeof run>, id: string) {
  return report.findings.find((f) => f.id === id)!;
}

describe('runDataDiagnostics', () => {
  it('clean dataset scores 100 with zero active findings', () => {
    const report = run([tx({})]);
    expect(report.score).toBe(100);
    expect(report.label).toBe('Sangat Sehat');
    expect(report.findings.every((f) => f.count === 0)).toBe(true);
    expect(report.totals).toEqual({ transactions: 1, periods: 2, categories: 2 });
  });

  it('detects orphaned transactions', () => {
    const report = run([tx({ id: 9, period_id: 999 }), tx({ id: 10, period_id: null })]);
    const f = findingOf(report, 'orphan_transactions');
    expect(f.count).toBe(2);
    expect(f.severity).toBe('high');
    expect(f.samples[0]).toContain('#9');
  });

  it('detects duplicate periods sharing the same date range', () => {
    const report = run([], {
      periods: [
        ...periods,
        { id: 3, month: 'Oktober 2026', start_date: '2026-10-21', end_date: '2026-11-20' },
      ],
    });
    const f = findingOf(report, 'duplicate_periods');
    expect(f.count).toBe(1);
    expect(f.samples[0]).toContain('id 2');
    expect(f.samples[0]).toContain('id 3');
  });

  it('flags date markers that are not the 1st or 21st', () => {
    const report = run([tx({ id: 5, date: '2026-05-31' })]);
    expect(findingOf(report, 'date_marker_anomalies').count).toBe(1);
  });

  it('flags unpaid transactions in past periods only', () => {
    const past = tx({ id: 1, period_id: 1, done: 0 });
    const active = tx({ id: 2, period_id: 2, done: 0 });
    const report = run([past, active]);
    const f = findingOf(report, 'unpaid_in_past');
    expect(f.count).toBe(1);
    expect(f.samples[0]).toContain('#1');
  });

  it('flags credit payments recorded as cash', () => {
    const report = run([
      tx({ id: 3, title: 'Credit Card Payment', type: 'cash' }),
      tx({ id: 4, title: 'Belanja', category: 'Credit Card', type: 'cash' }),
      tx({ id: 5, title: 'Kopi SUSU', type: 'cash' }),
    ]);
    const f = findingOf(report, 'credit_payment_misclassified');
    expect(f.count).toBe(2);
  });

  it('flags categories missing from the categories table, case-insensitive', () => {
    const report = run([
      tx({ id: 1, category: 'Hobi' }),
      tx({ id: 2, category: 'HOBI' }),
      tx({ id: 3, category: 'belanja' }),
    ]);
    const f = findingOf(report, 'unmapped_categories');
    expect(f.count).toBe(1);
    expect(f.samples[0]).toContain('Hobi');
  });

  it('flags missing and future created_time', () => {
    const report = run([
      tx({ id: 1, created_time: null }),
      tx({ id: 2, created_time: '2026-12-01T00:00:00.000Z' }),
    ]);
    expect(findingOf(report, 'created_time_missing').count).toBe(1);
    expect(findingOf(report, 'created_time_future').count).toBe(1);
  });

  it('flags zero-amount transactions and non-English month labels', () => {
    const report = run([tx({ id: 1, amount: 0 })], {
      periods: [...periods, { id: 4, month: 'Desember 2026', start_date: '2026-12-21', end_date: '2027-01-20' }],
    });
    expect(findingOf(report, 'zero_amount').count).toBe(1);
    expect(findingOf(report, 'month_labels').count).toBe(1);
  });

  it('caps per-check deduction and combines across checks', () => {
    const many = Array.from({ length: 50 }, (_, i) => tx({ id: i + 1, period_id: 999 }));
    const report = run(many);
    // 50 high-severity rows: capped at 30 points, not 150.
    expect(report.score).toBe(70);

    // 39 duplicate period extras (cap 30) + 200 orphans (cap 30) + 100 unpaid past (cap 15) = 75.
    const dupPeriods = Array.from({ length: 40 }, (_, i) => ({
      id: 100 + i,
      month: `January ${2020 + i}`,
      start_date: '2025-01-21',
      end_date: '2025-02-20',
    }));
    const mixed = [
      ...Array.from({ length: 200 }, (_, i) => tx({ id: 1000 + i, period_id: 999 })),
      ...Array.from({ length: 100 }, (_, i) => tx({ id: 2000 + i, period_id: 1, done: 0 })),
    ];
    const report2 = run(mixed, { periods: [...periods, ...dupPeriods] });
    expect(report2.score).toBe(25);
  });

  it('limits samples to five rows and reports the hidden count separately', () => {
    const many = Array.from({ length: 8 }, (_, i) => tx({ id: i + 1, period_id: 999 }));
    const f = findingOf(run(many), 'orphan_transactions');
    expect(f.samples.length).toBe(5);
  });
});

describe('healthLabel', () => {
  it('maps score bands to labels', () => {
    expect(healthLabel(95)).toBe('Sangat Sehat');
    expect(healthLabel(80)).toBe('Baik');
    expect(healthLabel(55)).toBe('Perlu Perawatan');
    expect(healthLabel(10)).toBe('Kritis');
  });
});

describe('FIXABLE_CHECKS', () => {
  it('only references finding ids that the engine actually emits', () => {
    const report = runDataDiagnostics({
      transactions: [
        tx({ id: 1, period_id: 999 }),
        tx({ id: 2, type: 'cash', title: 'Credit Card Bill' }),
        tx({ id: 3, date: '2026-05-31' }),
        tx({ id: 4, amount: 0 }),
        tx({ id: 5, created_time: null }),
        tx({ id: 6, created_time: '2027-01-01T00:00:00.000Z' }),
        tx({ id: 7, category: 'Mystery' }),
      ],
      periods: [
        { id: 10, month: 'Oktober 2024', start_date: '2024-10-21', end_date: '2024-11-20' },
        { id: 11, month: 'Oktober 2024', start_date: '2024-10-21', end_date: '2024-11-20' },
      ],
      categories: [{ id: 1, name: 'Makan' }],
      activePeriodId: 11,
      now: NOW,
    });
    const emitted = new Set(report.findings.map((f) => f.id));
    for (const id of Object.keys(FIXABLE_CHECKS)) {
      expect(emitted.has(id), `${id} must be a real finding id`).toBe(true);
    }
  });

  it('has non-empty confirm copy for every fixable check', () => {
    for (const [id, meta] of Object.entries(FIXABLE_CHECKS)) {
      expect(meta.confirmTitle.trim(), id).not.toBe('');
      expect(meta.confirmBody.trim(), id).not.toBe('');
    }
  });
});
