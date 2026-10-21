/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
  Line: () => <div data-testid="line-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
}));

vi.mock('../lib/api', () => ({
  fetchSummaries: vi.fn(),
  fetchTransactions: vi.fn(),
  fetchCategories: vi.fn(),
  fetchRecurringTransactions: vi.fn(),
  convertToInstallmentApi: vi.fn(),
}));

import CreditCardTracker from '../components/CreditCardTracker';
import {
  fetchSummaries,
  fetchTransactions,
  fetchCategories,
  fetchRecurringTransactions,
} from '../lib/api';
import type { MonthlySummary, Transaction, Category, RecurringTransaction } from '../lib/data';

const mockSummaries: MonthlySummary[] = [
  {
    period_id: 1,
    month: 'October 2026',
    date: '2026-10-21',
    income: 15000000,
    outcome: { cash: 5000000, credit_payment: 2000000, credit_expenses: 3000000, total: 10000000 },
    savings: 5000000,
    savings_rate_pct: 33.3,
    networth: 50000000,
    category_totals: {},
  },
];

const mockCategories: Category[] = [
  { id: 1, name: 'Tagihan', color: '#10b981', monthly_limit: 2000000, created_at: '2026-01-01' },
  { id: 2, name: 'Belanja Pribadi', color: '#3b82f6', monthly_limit: 3000000, created_at: '2026-01-01' },
];

const mockTransactions: Transaction[] = [
  {
    id: 101,
    period_id: 1,
    month: 'October 2026',
    date: '2026-10-21',
    title: 'Cicilan Hybrid Inverter (1/3)',
    category: 'Belanja Pribadi',
    amount: 1100910,
    currency: 'IDR',
    type: 'credit_expense',
    payment_method: 'Credit',
    done: true,
    created_time: '2026-10-15T12:00:00.000Z',
    notes: 'Cicilan 1/3',
  },
  {
    id: 102,
    period_id: 1,
    month: 'October 2026',
    date: '2026-10-21',
    title: 'Belanja Uniqlo',
    category: 'Belanja Pribadi',
    amount: 850000,
    currency: 'IDR',
    type: 'credit_expense',
    payment_method: 'Credit',
    done: false,
    created_time: '2026-10-18T12:00:00.000Z',
  },
  {
    id: 103,
    period_id: 1,
    month: 'October 2026',
    date: '2026-10-21',
    title: 'Pembayaran CC BCA',
    category: 'Tagihan',
    amount: 2000000,
    currency: 'IDR',
    type: 'credit_payment',
    payment_method: 'Bank Transfer',
    done: true,
    created_time: '2026-10-10T12:00:00.000Z',
  },
];

const mockRecurring: RecurringTransaction[] = [
  {
    id: 1,
    title: 'Cicilan Hybrid Inverter',
    category: 'Belanja Pribadi',
    amount: 1100910,
    type: 'credit_expense',
    payment_method: 'Credit',
    done: false,
    active: true,
    end_date: '2026-12',
    created_at: '15',
  },
];

describe('CreditCardTracker with Installments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSummaries).mockResolvedValue(mockSummaries);
    vi.mocked(fetchTransactions).mockResolvedValue(mockTransactions);
    vi.mocked(fetchCategories).mockResolvedValue(mockCategories);
    vi.mocked(fetchRecurringTransactions).mockResolvedValue(mockRecurring);
  });

  it('renders active installments section with summary badges and installment card', async () => {
    render(<CreditCardTracker />);

    await waitFor(() => {
      expect(screen.getByText(/Active Installments \(Cicilan Berjalan\)/i)).toBeInTheDocument();
    });

    expect(screen.getByText('1 Active')).toBeInTheDocument();
    expect(screen.getByText('Hybrid Inverter')).toBeInTheDocument();
    expect(screen.getByText(/Tenor: 1 of 3 mos/i)).toBeInTheDocument();
    expect(screen.getByText(/Ends: December 2026/i)).toBeInTheDocument();
  });

  it('renders Unpaid Credit Expenses table with Installment action button', async () => {
    render(<CreditCardTracker />);

    await waitFor(() => {
      expect(screen.getByText('Belanja Uniqlo')).toBeInTheDocument();
    });

    const installmentBtn = screen.getByRole('button', { name: /installment/i });
    expect(installmentBtn).toBeInTheDocument();

    fireEvent.click(installmentBtn);

    // Modal dialog should open
    await waitFor(() => {
      expect(screen.getByText(/Ubah Jadi Cicilan/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no active installments are present', async () => {
    vi.mocked(fetchRecurringTransactions).mockResolvedValue([]);

    render(<CreditCardTracker />);

    await waitFor(() => {
      expect(screen.getByText(/No active installments detected/i)).toBeInTheDocument();
    });
  });
});
