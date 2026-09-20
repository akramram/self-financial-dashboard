/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock all child deps BEFORE importing the component
vi.mock('../lib/utils', () => ({
  formatIdr: (n: number) => `IDR ${n.toLocaleString('id-ID')}`,
  getActivePeriod: () => ({ month: 'September', year: 2026 }),
}));

// Local-date helpers must run against a fixed "today": Sept 20 2026 (last day of "September 2026" period)
const FAKE_TODAY = new Date(2026, 8, 20, 10, 0, 0); // month 8 = September (0-indexed)
const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...args: [] | [number] | [number, number, number, number?, number?, number?, number?] | [string]) {
    if (args.length === 0) super(FAKE_TODAY.getTime());
    else super(...(args as ConstructorParameters<typeof RealDate>));
  }
  static now() { return FAKE_TODAY.getTime(); }
}
vi.stubGlobal('Date', FakeDate);

import DailyBudgetIndicator from '../components/DailyBudgetIndicator';
import type { Transaction } from '../lib/data';

const mk = (id: number, created_time: string, amount: number, done = true, type: Transaction['type'] = 'cash'): Transaction => ({
  id,
  date: '2026-09-21',
  title: `tx${id}`,
  category: 'Test',
  amount,
  currency: 'IDR',
  type,
  payment_method: 'Cash',
  done,
  created_time,
  notes: '',
  period_id: 38,
} as unknown as Transaction);

// Local-day timestamps (constructed in local tz so local-date mapping is stable)
const day = (offsetFromToday: number, hour = 8) => {
  const d = new RealDate(FAKE_TODAY.getTime());
  d.setDate(d.getDate() + offsetFromToday);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

describe('DailyBudgetIndicator — 7-day burn bars', () => {
  it('renders 7 bars with weekday labels and "Last 7 Days" header', () => {
    const txs = [mk(1, day(0), 50000), mk(2, day(-1), 200000)];
    render(
      <DailyBudgetIndicator
        transactions={txs}
        income={1000000}
        spent={200000}
        activeMonth="September 2026"
      />
    );
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    expect(screen.getByText('line = allowance')).toBeInTheDocument();
    // 7 bars rendered (title tooltip per bar)
    const bars = document.querySelectorAll('[title^="2026-"]');
    expect(bars.length).toBe(7);
  });

  it('aggregates spend per local day and colors over-allowance bars red', () => {
    // allowance = remaining/daysRemaining: income 1M, spent 300k, daysRemaining 1 → 700k
    // day -2 (Sept 18): 800k total (two txs) → over → red
    const txs = [
      mk(1, day(-2), 500000),
      mk(2, day(-2, 9), 300000),
      mk(3, day(-3), 100000),
    ];
    render(
      <DailyBudgetIndicator
        transactions={txs}
        income={1000000}
        spent={300000}
        activeMonth="September 2026"
      />
    );
    const overBar = document.querySelector('[title^="2026-09-18"]');
    expect(overBar).not.toBeNull();
    const style = overBar!.firstElementChild!.getAttribute('style') || '';
    expect(style.includes('rgb(239, 68, 68)') || style.includes('#ef4444')).toBe(true);
  });

  it('ignores unpaid and non-spend (credit_payment) transactions', () => {
    const txs = [
      mk(1, day(-4), 100000, false),                      // unpaid → ignored
      mk(2, day(-4), 999999, true, 'credit_payment'),     // payment type → ignored
      mk(3, day(-4), 50000),                              // counted
    ];
    const { rerender } = render(
      <DailyBudgetIndicator transactions={txs} income={1000000} spent={100000} activeMonth="September 2026" />
    );
    const bar = document.querySelector('[title^="2026-09-16"]');
    expect(bar).not.toBeNull();
    expect(bar!.getAttribute('title')).toContain('50.000');

    // sanity: rerender with empty list still renders 7 bars
    rerender(
      <DailyBudgetIndicator transactions={[]} income={1000000} spent={0} activeMonth="September 2026" />
    );
    expect(document.querySelectorAll('[title^="2026-"]').length).toBe(7);
  });
});
