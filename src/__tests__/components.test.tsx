/**
 * @vitest-environment jsdom
 * @jest-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom/vitest';

// ─── Mock dependencies ──────────────────────────────────────────────────────

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div data-testid="card-content" className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div data-testid="card-header" className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <div data-testid="card-title" className={className}>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => <span data-testid="badge" className={className} data-variant={variant}>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, ...rest }: any) => (
    <button data-testid="button" className={className} onClick={onClick} {...rest}>{children}</button>
  ),
}));

vi.mock('../components/Sparkline', () => ({
  default: ({ data, color }: any) => (
    <svg data-testid="sparkline" data-color={color}>
      <circle cx={data?.length || 0} />
    </svg>
  ),
}));

vi.mock('../lib/utils', () => ({
  formatIdr: (n: number) => `IDR ${Math.round(n).toLocaleString()}`,
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// ─── Import components at top level (module scope) ──────────────────────────

import DashboardSummaryCards from '../components/DashboardSummaryCards';
import SpendingPulse from '../components/SpendingPulse';
import AlertsPanel from '../components/AlertsPanel';
import FinancialInsights from '../components/FinancialInsights';

// ─── Shared test data helpers ────────────────────────────────────────────────

function makeSummary(month: string, income: number, outcome: number, periodId = 1) {
  return {
    period_id: periodId,
    month,
    date: '2026-07-08',
    income,
    outcome: { cash: outcome * 0.6, credit_payment: outcome * 0.4, credit_expenses: outcome * 0.3, total: outcome },
    savings: income - outcome,
    savings_rate_pct: income > 0 ? ((income - outcome) / income) * 100 : 0,
    networth: 0,
    category_totals: {},
  };
}

function makeSummaryWithCats(
  month: string,
  periodId: number,
  income: number,
  outcome: number,
  category_totals: Record<string, number>,
) {
  return {
    period_id: periodId,
    month,
    date: '2026-07-08',
    income,
    outcome: { cash: outcome * 0.6, credit_payment: outcome * 0.4, credit_expenses: outcome * 0.3, total: outcome },
    savings: income - outcome,
    savings_rate_pct: income > 0 ? ((income - outcome) / income) * 100 : 0,
    networth: 0,
    category_totals,
  };
}

function makeNetworth(month: string, total: number) {
  return {
    period_id: 1,
    month,
    date: '2026-07-20',
    total,
    currency: 'IDR',
    month_over_month_change: null,
    month_over_month_pct: null,
    breakdown: {},
  };
}

function makeCategory(name: string, limit: number) {
  return { id: 1, name, color: '#ef4444', monthly_limit: limit, created_at: '2026-01-01' };
}

// Mock fetch for anomaly API
const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;

// ─── DashboardSummaryCards tests ─────────────────────────────────────────────

describe('DashboardSummaryCards', () => {
  it('renders 4 cards: Income, Spending, Balance, Net Worth', () => {
    render(
      <DashboardSummaryCards
        summaries={[makeSummary('July 2026', 10_000_000, 7_000_000)]}
        networth={[makeNetworth('July 2026', 50_000_000)]}
        activeMonth="July 2026"
      />,
    );
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Spending')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Net Worth')).toBeInTheDocument();
  });

  it('Balance card shows positive value (income - spending)', () => {
    render(
      <DashboardSummaryCards
        summaries={[makeSummary('July 2026', 10_000_000, 7_000_000)]}
        networth={[makeNetworth('July 2026', 50_000_000)]}
        activeMonth="July 2026"
      />,
    );
    const balanceEl = screen.getByText('Balance');
    const card = balanceEl.closest('.glass-card')!;
    expect(card.textContent).toContain('3,000,000');
  });

  it('Balance card shows negative value when spending > income', () => {
    render(
      <DashboardSummaryCards
        summaries={[makeSummary('July 2026', 5_000_000, 7_000_000)]}
        networth={[makeNetworth('July 2026', 50_000_000)]}
        activeMonth="July 2026"
      />,
    );
    const balanceEl = screen.getByText('Balance');
    const card = balanceEl.closest('.glass-card')!;
    expect(card.textContent).toContain('-2,000,000');
  });

  it('Balance delta shows +prefix for positive month-over-month change', () => {
    const summaries = [
      makeSummary('June 2026', 9_000_000, 6_000_000),  // prev balance: 3M
      makeSummary('July 2026', 10_000_000, 6_000_000), // curr balance: 4M
    ];
    render(
      <DashboardSummaryCards
        summaries={summaries}
        networth={[makeNetworth('July 2026', 50_000_000)]}
        activeMonth="July 2026"
      />,
    );
    const balanceEl = screen.getByText('Balance');
    const card = balanceEl.closest('.glass-card')!;
    expect(card.textContent).toContain('IDR 1,000,000');
  });

  it('Balance sparkline renders (last 6 months of income - outcome)', () => {
    const summaries = [
      makeSummary('Feb 2026', 8_000_000, 5_000_000),
      makeSummary('Mar 2026', 9_000_000, 6_000_000),
      makeSummary('Apr 2026', 10_000_000, 5_000_000),
      makeSummary('May 2026', 8_500_000, 7_000_000),
      makeSummary('June 2026', 9_500_000, 6_500_000),
      makeSummary('July 2026', 10_000_000, 7_000_000),
    ];
    render(
      <DashboardSummaryCards
        summaries={summaries}
        networth={[makeNetworth('July 2026', 50_000_000)]}
        activeMonth="July 2026"
      />,
    );
    const sparklines = screen.getAllByTestId('sparkline');
    expect(sparklines.length).toBe(4);
  });

  it('uses cyan color (#06b6d4) for Balance card', () => {
    render(
      <DashboardSummaryCards
        summaries={[makeSummary('July 2026', 10_000_000, 7_000_000)]}
        networth={[makeNetworth('July 2026', 50_000_000)]}
        activeMonth="July 2026"
      />,
    );
    const colorBars = document.querySelectorAll('[style*="background-color"]');
    const colors = Array.from(colorBars).map(
      (el) => (el as HTMLElement).style.backgroundColor,
    );
    expect(colors).toContain('rgb(6, 182, 212)');
  });

  it('returns null when no summaries and no networth', () => {
    const { container } = render(
      <DashboardSummaryCards summaries={[]} networth={[]} activeMonth="July 2026" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('Balance deltaPct handles zero previous balance', () => {
    render(
      <DashboardSummaryCards
        summaries={[makeSummary('July 2026', 10_000_000, 7_000_000)]}
        networth={[makeNetworth('July 2026', 50_000_000)]}
        activeMonth="July 2026"
      />,
    );
    const balanceEl = screen.getByText('Balance');
    const card = balanceEl.closest('.glass-card')!;
    expect(card.textContent).toContain('%');
  });
});

// ─── SpendingPulse tests ────────────────────────────────────────────────────

describe('SpendingPulse', () => {
  it('returns null when no matching summary', () => {
    const { container } = render(
      <SpendingPulse summaries={[]} activeMonth="July 2026" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when income is zero', () => {
    const { container } = render(
      <SpendingPulse
        summaries={[makeSummary('July 2026', 0, 1000)]}
        activeMonth="July 2026"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders key sections: Time, Spend, Budget, PACE', () => {
    render(
      <SpendingPulse
        summaries={[makeSummary('July 2026', 10_000_000, 4_000_000)]}
        activeMonth="July 2026"
      />,
    );
    expect(screen.getByText('Spending Pulse')).toBeInTheDocument();
    expect(screen.getByText('Time Elapsed')).toBeInTheDocument();
    expect(screen.getByText('Spend vs Expected')).toBeInTheDocument();
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('PACE')).toBeInTheDocument();
  });

  it('shows Cash vs Credit when both are positive', () => {
    render(
      <SpendingPulse
        summaries={[makeSummary('July 2026', 10_000_000, 4_000_000)]}
        activeMonth="July 2026"
      />,
    );
    expect(screen.getByText('Cash vs Credit')).toBeInTheDocument();
  });

  it('hides Cash vs Credit when cash and credit are 0', () => {
    const summary = makeSummary('July 2026', 10_000_000, 4_000_000);
    summary.outcome.cash = 0;
    summary.outcome.credit_payment = 0;
    render(
      <SpendingPulse summaries={[summary]} activeMonth="July 2026" />,
    );
    expect(screen.queryByText('Cash vs Credit')).not.toBeInTheDocument();
  });

  it('budget bar uses green class when spending < 50% of income', () => {
    render(
      <SpendingPulse
        summaries={[makeSummary('July 2026', 10_000_000, 2_000_000)]}
        activeMonth="July 2026"
      />,
    );
    const greenBars = document.querySelectorAll('.bg-emerald-500');
    expect(greenBars.length).toBeGreaterThan(0);
  });

  it('budget bar uses red class when spending > 80% of income', () => {
    render(
      <SpendingPulse
        summaries={[makeSummary('July 2026', 10_000_000, 9_000_000)]}
        activeMonth="July 2026"
      />,
    );
    const redBars = document.querySelectorAll('.bg-red-500');
    expect(redBars.length).toBeGreaterThan(0);
  });

  it('shows projected total text', () => {
    render(
      <SpendingPulse
        summaries={[makeSummary('July 2026', 10_000_000, 4_000_000)]}
        activeMonth="July 2026"
      />,
    );
    expect(screen.getByText(/Projected period total/)).toBeInTheDocument();
  });
});

// ─── AlertsPanel tests ───────────────────────────────────────────────────────

describe('AlertsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
    mockFetch.mockResolvedValue({ json: () => Promise.resolve([]) });
    const store: Record<string, string> = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = val; });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns null during loading (pending fetch)', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <AlertsPanel
        month="July 2026"
        summaries={[makeSummaryWithCats('July 2026', 1, 10_000_000, 4_000_000, { Food: 400000 })]}
        categories={[makeCategory('Food', 500000)]}
        transactions={[]}
        recurringTitles={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when no alerts exist', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve([]) });
    const { container } = render(
      <AlertsPanel
        month="July 2026"
        summaries={[makeSummaryWithCats('July 2026', 1, 10_000_000, 4_000_000, { Food: 300000 })]}
        categories={[makeCategory('Food', 500000)]}
        transactions={[]}
        recurringTitles={[]}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-testid="card"]')).toBeNull();
    });
  });

  it('renders over-budget alert when category exceeds limit', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve([]) });
    const txs = [
      { id: 1, period_id: 1, title: 'Grab Food', category: 'Food', amount: 500000, type: 'cash', done: 1 },
    ];
    render(
      <AlertsPanel
        month="July 2026"
        summaries={[makeSummaryWithCats('July 2026', 1, 10_000_000, 4_000_000, { Food: 500000 })]}
        categories={[makeCategory('Food', 400000)]}
        transactions={txs}
        recurringTitles={[]}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });
    expect(screen.getByText(/Food is over budget/)).toBeInTheDocument();
  });

  it('renders approaching alert when category at 80%+ of limit', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve([]) });
    const txs = [
      { id: 1, period_id: 1, title: 'Lunch', category: 'Food', amount: 400000, type: 'cash', done: 1 },
    ];
    render(
      <AlertsPanel
        month="July 2026"
        summaries={[makeSummaryWithCats('July 2026', 1, 10_000_000, 4_000_000, { Food: 400000 })]}
        categories={[makeCategory('Food', 500000)]}
        transactions={txs}
        recurringTitles={[]}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });
    expect(screen.getByText(/Food approaching limit/)).toBeInTheDocument();
  });

  it('renders anomaly alerts from API response', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve([{
        id: 99,
        title: 'Big spike',
        category: 'Food',
        amount: 5000000,
        type: 'cash',
        created_time: '2026-07-08',
        reason: 'amount_spike' as const,
        severity: 'high' as const,
        detail: '5M is way more than usual',
      }]),
    });
    render(
      <AlertsPanel
        month="July 2026"
        summaries={[makeSummaryWithCats('July 2026', 1, 10_000_000, 4_000_000, {})]}
        categories={[]}
        transactions={[]}
        recurringTitles={[]}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Big spike')).toBeInTheDocument();
    });
    expect(screen.getByText('Anomaly: Unusual Amount')).toBeInTheDocument();
  });

  it('shows "X over" badge for high severity alerts', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve([]) });
    const txs = [
      { id: 1, period_id: 1, title: 'Steak', category: 'Food', amount: 600000, type: 'cash', done: 1 },
    ];
    render(
      <AlertsPanel
        month="July 2026"
        summaries={[makeSummaryWithCats('July 2026', 1, 10_000_000, 4_000_000, { Food: 600000 })]}
        categories={[makeCategory('Food', 500000)]}
        transactions={txs}
        recurringTitles={[]}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('1 over')).toBeInTheDocument();
    });
  });

  it('shows "X approaching" badge for medium severity alerts', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve([]) });
    const txs = [
      { id: 1, period_id: 1, title: 'Lunch', category: 'Food', amount: 400000, type: 'cash', done: 1 },
    ];
    render(
      <AlertsPanel
        month="July 2026"
        summaries={[makeSummaryWithCats('July 2026', 1, 10_000_000, 4_000_000, { Food: 400000 })]}
        categories={[makeCategory('Food', 500000)]}
        transactions={txs}
        recurringTitles={[]}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('1 approaching')).toBeInTheDocument();
    });
  });

  it('card border is red when critical (high severity) alerts exist', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve([]) });
    const txs = [
      { id: 1, period_id: 1, title: 'Steak', category: 'Food', amount: 600000, type: 'cash', done: 1 },
    ];
    render(
      <AlertsPanel
        month="July 2026"
        summaries={[makeSummaryWithCats('July 2026', 1, 10_000_000, 4_000_000, { Food: 600000 })]}
        categories={[makeCategory('Food', 500000)]}
        transactions={txs}
        recurringTitles={[]}
      />,
    );
    await waitFor(() => {
      const card = document.querySelector('.glass-card') as HTMLElement;
      expect(card?.className).toContain('border-red-300');
    });
  });

  it('dismiss button removes budget alert from view', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve([]) });
    const txs = [
      { id: 1, period_id: 1, title: 'Steak', category: 'Food', amount: 600000, type: 'cash', done: 1 },
    ];
    render(
      <AlertsPanel
        month="July 2026"
        summaries={[makeSummaryWithCats('July 2026', 1, 10_000_000, 4_000_000, { Food: 600000 })]}
        categories={[makeCategory('Food', 500000)]}
        transactions={txs}
        recurringTitles={[]}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Food is over budget/)).toBeInTheDocument();
    });
    const dismissBtn = screen.getAllByTitle('Dismiss')[0];
    dismissBtn.click();
    await waitFor(() => {
      expect(screen.queryByText(/Food is over budget/)).not.toBeInTheDocument();
    });
  });

  it('broadcasts alerts-count event with live alert total for sidebar bells', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve([]) });
    const txs = [
      { id: 1, period_id: 1, title: 'Steak', category: 'Food', amount: 600000, type: 'cash', done: 1 },
      { id: 2, period_id: 1, title: 'Coffee', category: 'Drink', amount: 450000, type: 'cash', done: 1 },
    ];
    const events: number[] = [];
    const listener = (e: Event) => events.push((e as CustomEvent<number>).detail);
    window.addEventListener('alerts-count', listener);
    render(
      <AlertsPanel
        month="July 2026"
        summaries={[makeSummaryWithCats('July 2026', 1, 10_000_000, 4_000_000, { Food: 600000, Drink: 450000 })]}
        categories={[makeCategory('Food', 500000), makeCategory('Drink', 500000)]}
        transactions={txs}
        recurringTitles={[]}
      />,
    );
    await waitFor(() => {
      expect(events).toContain(2);
    });
    window.removeEventListener('alerts-count', listener);
  });

  it('rebroadcasts lower count after dismissal', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve([]) });
    const txs = [
      { id: 1, period_id: 1, title: 'Steak', category: 'Food', amount: 600000, type: 'cash', done: 1 },
    ];
    const events: number[] = [];
    const listener = (e: Event) => events.push((e as CustomEvent<number>).detail);
    window.addEventListener('alerts-count', listener);
    render(
      <AlertsPanel
        month="July 2026"
        summaries={[makeSummaryWithCats('July 2026', 1, 10_000_000, 4_000_000, { Food: 600000 })]}
        categories={[makeCategory('Food', 500000)]}
        transactions={txs}
        recurringTitles={[]}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Food is over budget/)).toBeInTheDocument();
    });
    screen.getAllByTitle('Dismiss')[0].click();
    await waitFor(() => {
      expect(events[events.length - 1]).toBe(0);
    });
    window.removeEventListener('alerts-count', listener);
  });
});

describe('FinancialInsights', () => {
  it('flags unpaid transactions for the active period (period_id filter, not t.month)', () => {
    const txs = [
      { id: 1, period_id: 1, month: 'July 2026', title: 'Netflix', category: 'Tagihan', amount: 150000, type: 'cash', done: false },
      { id: 2, period_id: 1, month: 'July 2026', title: 'Gaji', category: 'Income', amount: 10000000, type: 'cash', done: true },
      // different period — must NOT count even though t.month label differs
      { id: 3, period_id: 2, month: 'August 2026', title: 'Old bill', category: 'Tagihan', amount: 200000, type: 'cash', done: false },
    ];
    render(
      <FinancialInsights
        transactions={txs as any}
        networth={[]}
        summaries={[makeSummary('July 2026', 10_000_000, 7_000_000, 1)]}
        categories={[]}
        activeMonth="July 2026"
      />,
    );
    expect(screen.getByText('Unpaid Transactions')).toBeInTheDocument();
    expect(screen.getByText(/1 unpaid bill totaling IDR 150,000/)).toBeInTheDocument();
  });

  it('shows All Caught Up when the active period has no unpaid transactions', () => {
    const txs = [
      { id: 1, period_id: 1, title: 'Netflix', category: 'Tagihan', amount: 150000, type: 'cash', done: true },
      // unpaid but belongs to another period
      { id: 2, period_id: 2, title: 'Old bill', category: 'Tagihan', amount: 200000, type: 'cash', done: false },
    ];
    render(
      <FinancialInsights
        transactions={txs as any}
        networth={[]}
        summaries={[makeSummary('July 2026', 10_000_000, 7_000_000, 1)]}
        categories={[]}
        activeMonth="July 2026"
      />,
    );
    expect(screen.getByText('All Caught Up')).toBeInTheDocument();
    expect(screen.queryByText('Unpaid Transactions')).not.toBeInTheDocument();
  });
});

// ─── UpcomingBills tests ────────────────────────────────────────────────────

import UpcomingBills from '../components/UpcomingBills';

function makeRecurring(overrides: Partial<any> = {}) {
  return {
    id: 1,
    title: 'Netflix',
    category: 'Tagihan',
    amount: 150000,
    type: 'cash',
    payment_method: 'Cash',
    done: false,
    active: true,
    end_date: null,
    created_at: '5',
    ...overrides,
  } as any;
}

function makeTx(overrides: Partial<any> = {}) {
  return {
    id: 900,
    period_id: 38,
    month: 'September 2026',
    date: '2026-08-21',
    title: 'Netflix',
    category: 'Tagihan',
    amount: 150000,
    currency: 'IDR',
    type: 'cash',
    payment_method: 'Cash',
    done: true,
    created_time: '2026-08-25T02:00:00.000Z',
    ...overrides,
  } as any;
}

describe('UpcomingBills', () => {
  it('renders bill rows with title and amount (live amount from period tx)', () => {
    render(
      <UpcomingBills
        recurring={[makeRecurring({ id: 1, title: 'Kontrakan', amount: 1150000, created_at: '4' })]}
        transactions={[makeTx({ id: 913, title: 'Kontrakan', amount: 1100000, done: false })]}
        activePeriodId={38}
        activeMonth="August 2026"
      />,
    );
    expect(screen.getByText('Kontrakan')).toBeInTheDocument();
    // real billed amount (1.1M) wins over template amount (1.15M)
    expect(screen.getAllByText('IDR 1,100,000').length).toBeGreaterThan(0);
    expect(screen.getByText(/pending/)).toBeInTheDocument();
  });

  it('derives paid status from the generated period transaction, not the template done flag', () => {
    render(
      <UpcomingBills
        recurring={[
          // template says done=true, but the period tx is unpaid → must render unpaid (no mint check)
          makeRecurring({ id: 1, title: 'StaleTpl', created_at: '22', done: true }),
        ]}
        transactions={[makeTx({ id: 950, title: 'StaleTpl', done: false })]}
        activePeriodId={38}
        activeMonth="August 2026"
      />,
    );
    expect(screen.getByText('StaleTpl')).toBeInTheDocument();
    expect(screen.getByText('OVERDUE')).toBeInTheDocument(); // due Jul 22 — past, unpaid
    // no line-through paid styling on the title
    const title = screen.getByText('StaleTpl');
    expect(title.className).not.toContain('line-through');
  });

  it('marks a bill paid when its period transaction is done even if template is done=false', () => {
    render(
      <UpcomingBills
        recurring={[makeRecurring({ id: 1, title: 'PaidLive', created_at: '28', done: false })]}
        transactions={[makeTx({ id: 951, title: 'PaidLive', done: true })]}
        activePeriodId={38}
        activeMonth="August 2026"
      />,
    );
    expect(screen.getByText('PaidLive')).toBeInTheDocument();
    expect(screen.queryByText('OVERDUE')).not.toBeInTheDocument();
    const title = screen.getByText('PaidLive');
    expect(title.className).toContain('line-through');
  });

  it('ignores transactions from other periods', () => {
    render(
      <UpcomingBills
        recurring={[makeRecurring({ id: 1, title: 'OtherPeriod', created_at: '22' })]}
        transactions={[makeTx({ id: 952, title: 'OtherPeriod', done: true, period_id: 37 })]}
        activePeriodId={38}
        activeMonth="August 2026"
      />,
    );
    // tx belongs to period 37, not the active 38 → bill stays unpaid → OVERDUE
    expect(screen.getByText('OVERDUE')).toBeInTheDocument();
  });

  it('calls onTogglePaid with the period tx id when a bill row is tapped', async () => {
    const onTogglePaid = vi.fn();
    render(
      <UpcomingBills
        recurring={[makeRecurring({ id: 1, title: 'TapMe', created_at: '28', done: false })]}
        transactions={[makeTx({ id: 953, title: 'TapMe', done: false })]}
        activePeriodId={38}
        activeMonth="August 2026"
        onTogglePaid={onTogglePaid}
      />,
    );
    const row = screen.getByRole('button', { name: /Mark TapMe as paid/i });
    await userEvent.click(row);
    expect(onTogglePaid).toHaveBeenCalledWith({ txId: 953, title: 'TapMe', amount: 150000, done: true });
  });

  it('does not render toggle affordance when onTogglePaid is absent', () => {
    render(
      <UpcomingBills
        recurring={[makeRecurring({ id: 1, title: 'NoToggle', created_at: '28', done: false })]}
        transactions={[makeTx({ id: 954, title: 'NoToggle', done: false })]}
        activePeriodId={38}
        activeMonth="August 2026"
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('skips inactive recurring items and items past their end_date', () => {
    render(
      <UpcomingBills
        recurring={[
          makeRecurring({ id: 1, title: 'Paused', active: false }),
          makeRecurring({ id: 2, title: 'Ended', end_date: '2026-07' }), // active period Aug 2026 > end 2026-07
          makeRecurring({ id: 3, title: 'Still Active', end_date: '2026-09' }),
        ]}
        transactions={[]}
        activePeriodId={38}
        activeMonth="August 2026"
      />,
    );
    expect(screen.queryByText('Paused')).not.toBeInTheDocument();
    expect(screen.queryByText('Ended')).not.toBeInTheDocument();
    expect(screen.getByText('Still Active')).toBeInTheDocument();
  });

  it('renders nothing when no active recurring items exist', () => {
    const { container } = render(
      <UpcomingBills recurring={[makeRecurring({ active: false })]} transactions={[]} activePeriodId={38} activeMonth="August 2026" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
