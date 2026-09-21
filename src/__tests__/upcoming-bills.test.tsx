/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../lib/utils', () => ({
  formatIdr: (n: number) => `IDR ${n.toLocaleString('id-ID')}`,
  getActivePeriod: () => ({ month: 'October', year: 2026 }),
}));

import UpcomingBills from '../components/UpcomingBills';
import type { RecurringTransaction, Transaction } from '../lib/data';

// Fixed "today": Sep 25 2026 — inside the "October 2026" period (Sep 21 → Oct 20)
const FAKE_TODAY = new Date(2026, 8, 25, 10, 0, 0);
const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...args: [] | [number] | [number, number, number, number?, number?, number?, number?] | [string]) {
    if (args.length === 0) super(FAKE_TODAY.getTime());
    else super(...(args as ConstructorParameters<typeof RealDate>));
  }
  static now() { return FAKE_TODAY.getTime(); }
}
vi.stubGlobal('Date', FakeDate);

const mkTx = (id: number, title: string, amount: number, type: string, done: boolean, created_time: string): Transaction => ({
  id, date: '2026-09-21', title, category: 'Test', amount, currency: 'IDR',
  type: type as Transaction['type'], payment_method: 'Cash', done, created_time, notes: '', period_id: 44,
} as unknown as Transaction);

const mkRec = (id: number, title: string, amount: number, created_at: string, active = 1): RecurringTransaction => ({
  id, title, category: 'Test', amount, currency: 'IDR', type: 'cash', payment_method: 'Cash',
  done: 0, active, created_at, end_date: null,
} as unknown as RecurringTransaction);

describe('UpcomingBills — one-off unpaid obligations', () => {
  it('includes a one-off unpaid tx (e.g. CC Payment) with one-off badge and toggle', () => {
    const onTogglePaid = vi.fn();
    const cc = mkTx(101, 'CC Payment — September 2026', 13296977, 'credit_payment', false, '2026-09-21T03:08:51.171Z');
    render(
      <UpcomingBills
        recurring={[mkRec(1, 'Netflix', 54000, '1')]}
        transactions={[cc, mkTx(102, 'Netflix', 54000, 'cash', false, '2026-10-01T02:00:00.000Z')]}
        activePeriodId={44}
        activeMonth="October 2026"
        onTogglePaid={onTogglePaid}
      />
    );
    expect(screen.getByText('CC Payment — September 2026')).toBeInTheDocument();
    expect(screen.getByText('one-off', { exact: false }).textContent).toContain('one-off');
    // The one-off row is clickable (toggleable)
    fireEvent.click(screen.getByText('CC Payment — September 2026').closest('li')!);
    expect(onTogglePaid).toHaveBeenCalledWith(expect.objectContaining({ txId: 101, title: 'CC Payment — September 2026', amount: 13296977, done: true }));
  });

  it('excludes paid one-offs and one-offs covered by an active recurring title', () => {
    const paid = mkTx(201, 'Sepulsa one-time', 50000, 'cash', true, '2026-09-22T02:00:00.000Z');
    const covered = mkTx(202, 'Netflix', 54000, 'cash', false, '2026-10-01T02:00:00.000Z');
    render(
      <UpcomingBills
        recurring={[mkRec(1, 'Netflix', 54000, '1')]}
        transactions={[paid, covered]}
        activePeriodId={44}
        activeMonth="October 2026"
      />
    );
    expect(screen.queryByText('Sepulsa one-time')).not.toBeInTheDocument(); // paid → not a pending obligation
    expect(screen.queryByText('one-off')).not.toBeInTheDocument(); // Netflix covered by template, not one-off
  });

  it('parks a one-off with out-of-range timestamp at the period end date', () => {
    // created_time in 2025 — outside Oct 2026 period → clamped to Oct 20 2026
    const weird = mkTx(301, 'Manual debt', 100000, 'cash', false, '2025-01-01T00:00:00.000Z');
    render(
      <UpcomingBills
        recurring={[]}
        transactions={[weird]}
        activePeriodId={44}
        activeMonth="October 2026"
      />
    );
    expect(screen.getByText('Manual debt')).toBeInTheDocument();
    expect(screen.getByText(/due Oct 20/i)).toBeInTheDocument();
  });

  it('unpaid one-off total shows in pending summary', () => {
    const cc = mkTx(401, 'CC Payment — September 2026', 100000, 'credit_payment', false, '2026-09-21T03:08:51.171Z');
    render(
      <UpcomingBills
        recurring={[]}
        transactions={[cc]}
        activePeriodId={44}
        activeMonth="October 2026"
      />
    );
    expect(screen.getByText(/pending/)).toBeInTheDocument();
    expect(screen.getAllByText('IDR 100.000').length).toBeGreaterThan(0);
  });

  it('shows TODAY chip for a one-off due later today (calendar-day diff, not ceil)', () => {
    // created_time today at 10:08 local — due date is TODAY, must not show "1d"
    const today10am = new RealDate(FAKE_TODAY.getTime());
    today10am.setHours(10, 8, 0, 0);
    const cc = mkTx(501, 'CC Payment — September 2026', 100000, 'credit_payment', false, today10am.toISOString());
    render(
      <UpcomingBills
        recurring={[]}
        transactions={[cc]}
        activePeriodId={44}
        activeMonth="October 2026"
      />
    );
    expect(screen.getByText('TODAY')).toBeInTheDocument();
    expect(screen.queryByText('1d')).not.toBeInTheDocument();
  });
});
