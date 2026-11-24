/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `Rp ${n.toLocaleString('id-ID')}`,
    formatNumber: (n: number) => String(n),
  };
});

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Chart: () => <div data-testid="combo-chart" />,
}));

import CashFlowWaterfall from '../components/CashFlowWaterfall';
import type { MonthlySummary, Category } from '../lib/data';

const mockSummaries: MonthlySummary[] = [
  {
    period_id: 1,
    month: 'September 2026',
    date: '2026-08-21',
    income: 20000000,
    outcome: { cash: 6000000, credit_payment: 10000000, credit_expenses: 8000000, total: 16000000 },
    savings: 4000000,
    savings_rate_pct: 20,
    networth: 40000000,
    category_totals: {
      Tagihan: 4000000,
      Makanan: 3000000,
      'Belanja Pribadi': 2000000,
    },
  },
  {
    period_id: 2,
    month: 'October 2026',
    date: '2026-09-21',
    income: 23000000,
    outcome: { cash: 8000000, credit_payment: 10000000, credit_expenses: 9000000, total: 18000000 },
    savings: 5000000,
    savings_rate_pct: 21.7,
    networth: 45000000,
    category_totals: {
      Tagihan: 5000000,
      Makanan: 4000000,
      'Belanja Pribadi': 3000000,
      Invest: 1000000,
    },
  },
];

const mockCategories: Category[] = [
  { id: 1, name: 'Tagihan', color: '#10b981', monthly_limit: 6000000, created_at: '2026-01-01' },
  { id: 2, name: 'Makanan', color: '#eab308', monthly_limit: 5000000, created_at: '2026-01-01' },
  { id: 3, name: 'Belanja Pribadi', color: '#8b5cf6', monthly_limit: 4000000, created_at: '2026-01-01' },
  { id: 4, name: 'Invest', color: '#06b6d4', monthly_limit: 2000000, created_at: '2026-01-01' },
];

describe('CashFlowWaterfall Component', () => {
  it('renders Waterfall view with top stats and 50/30/20 allocation card', () => {
    render(<CashFlowWaterfall summaries={mockSummaries} categories={mockCategories} />);

    // Check tabs
    expect(screen.getByRole('button', { name: /waterfall view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trend & history/i })).toBeInTheDocument();

    // Check 50/30/20 card
    expect(screen.getByText(/50\/30\/20 Cash Allocation Rule/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs \(Kebutuhan\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Wants \(Keinginan\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Savings & Invest/i)).toBeInTheDocument();

    // Check stats row
    expect(screen.getAllByText(/Total Income/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Total Spent/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Remaining/i).length).toBeGreaterThan(0);
  });

  it('switches to Trend & History tab and displays multi-period metrics and history table', () => {
    render(<CashFlowWaterfall summaries={mockSummaries} categories={mockCategories} />);

    const trendTabBtn = screen.getByRole('button', { name: /trend & history/i });
    fireEvent.click(trendTabBtn);

    // Should display KPI cards for Cash Flow Health
    expect(screen.getByText(/Surplus Streak/i)).toBeInTheDocument();
    expect(screen.getByText(/Inflow \/ Outflow Ratio/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg Net Cashflow/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Net Accumulated/i)).toBeInTheDocument();

    // Should display Multi-Period History Table
    expect(screen.getByText(/Cash Flow Period History/i)).toBeInTheDocument();
    // Months should be listed
    expect(screen.getAllByText('October 2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('September 2026').length).toBeGreaterThan(0);
  });

  it('handles empty summaries list without crashing', () => {
    render(<CashFlowWaterfall summaries={[]} categories={mockCategories} />);
    expect(screen.getByText(/Belum ada transaksi di bulan ini/i)).toBeInTheDocument();
  });
});
