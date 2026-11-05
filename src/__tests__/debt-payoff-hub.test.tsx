/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DebtPayoffHub from '../components/DebtPayoffHub';
import type { MonthlySummary, RecurringTransaction, Transaction } from '../lib/data';

describe('DebtPayoffHub Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const mockSummaries: MonthlySummary[] = [
    {
      month: 'October 2026',
      period_id: 1,
      date: '2026-10-21',
      income: 15000000,
      outcome: {
        total: 8000000,
        cash: 3000000,
        credit_payment: 5000000,
        credit_expenses: 800000,
      },
      category_totals: {},
      networth: 50000000,
      savings: 7000000,
      savings_rate_pct: 46.7,
    },
  ];

  const mockRecurring: RecurringTransaction[] = [
    {
      id: 1,
      title: 'Cicilan MacBook (3/12)',
      amount: 1500000,
      category: 'Elektronik',
      type: 'credit_expense',
      payment_method: 'Credit Card',
      done: false,
      active: true,
      end_date: '2027-07-01',
      created_at: '2026-08-01',
    },
    {
      id: 2,
      title: 'Cicilan HP (10/12)',
      amount: 500000,
      category: 'Gadget',
      type: 'credit_expense',
      payment_method: 'Credit Card',
      done: false,
      active: true,
      end_date: '2026-12-01',
      created_at: '2026-01-01',
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 101,
      period_id: 1,
      month: 'October 2026',
      title: 'Belanja Supermarket',
      amount: 800000,
      category: 'Belanja',
      currency: 'IDR',
      type: 'credit_expense',
      payment_method: 'Credit Card',
      done: false,
      date: '2026-10-21',
      created_time: '2026-10-21T10:00:00.000Z',
    },
  ];

  it('renders credit health radar, utilization and DTI cards', () => {
    render(
      <DebtPayoffHub
        transactions={mockTransactions}
        recurring={mockRecurring}
        summaries={mockSummaries}
        activePeriodMonth="October 2026"
      />
    );

    expect(screen.getByText(/Credit Card Debt Payoff & Health Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/Radar Kesehatan Kredit & Batas Limit/i)).toBeInTheDocument();
    expect(screen.getByText(/Credit Utilization/i)).toBeInTheDocument();
    expect(screen.getByText(/Rasio Beban Cicilan \(DTI\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Rekomendasi Cerdas Finansial/i)).toBeInTheDocument();
  });

  it('updates credit limit when quick preset chip is clicked', () => {
    render(
      <DebtPayoffHub
        transactions={mockTransactions}
        recurring={mockRecurring}
        summaries={mockSummaries}
        activePeriodMonth="October 2026"
      />
    );

    const btn30Jt = screen.getByRole('button', { name: '30 Jt' });
    fireEvent.click(btn30Jt);

    expect(localStorage.getItem('findash_credit_limit_target')).toBe('30000000');
    expect(screen.getByText(/Limit: IDR 30.000.000/i)).toBeInTheDocument();
  });

  it('switches between Avalanche and Snowball payoff strategies', () => {
    render(
      <DebtPayoffHub
        transactions={mockTransactions}
        recurring={mockRecurring}
        summaries={mockSummaries}
        activePeriodMonth="October 2026"
      />
    );

    const snowballBtn = screen.getByRole('button', { name: /Snowball \(Saldo Kecil\)/i });
    fireEvent.click(snowballBtn);

    expect(screen.getByText(/Urutan Penyelesaian Utang \(Snowball\)/i)).toBeInTheDocument();

    const avalancheBtn = screen.getByRole('button', { name: /Avalanche \(Bunga Tinggi\)/i });
    fireEvent.click(avalancheBtn);

    expect(screen.getByText(/Urutan Penyelesaian Utang \(Avalanche\)/i)).toBeInTheDocument();
  });

  it('adjusts extra payment allocation via preset chips', () => {
    render(
      <DebtPayoffHub
        transactions={mockTransactions}
        recurring={mockRecurring}
        summaries={mockSummaries}
        activePeriodMonth="October 2026"
      />
    );

    const chip1Jt = screen.getByRole('button', { name: '+1.000.000' });
    fireEvent.click(chip1Jt);

    expect(screen.getByText(/\+IDR 1.000.000 \/ bln/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Bebas Utang/i)).toBeInTheDocument();
    expect(screen.getByText(/Waktu Dihemat/i)).toBeInTheDocument();
  });

  it('renders cash flow liberation milestones for active installments', () => {
    render(
      <DebtPayoffHub
        transactions={mockTransactions}
        recurring={mockRecurring}
        summaries={mockSummaries}
        activePeriodMonth="October 2026"
      />
    );

    expect(screen.getByText(/Linimasa Pelepasan Arus Kas/i)).toBeInTheDocument();
    expect(screen.getByText(/Milestone #1/i)).toBeInTheDocument();
  });

  it('renders celebratory clean state when there are zero debts', () => {
    render(
      <DebtPayoffHub
        transactions={[]}
        recurring={[]}
        summaries={mockSummaries}
        activePeriodMonth="October 2026"
      />
    );

    expect(screen.getByText(/Tidak Ada Utang atau Cicilan Aktif/i)).toBeInTheDocument();
    expect(screen.getByText(/Lunas Sekarang 🎉/i)).toBeInTheDocument();
  });
});
