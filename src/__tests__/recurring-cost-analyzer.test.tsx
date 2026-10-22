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
  Doughnut: () => <div data-testid="doughnut-chart" />,
}));

import RecurringCostAnalyzer, {
  type RecurringCostResult,
} from '../components/RecurringCostAnalyzer';

const mockAnalysisResult: RecurringCostResult = {
  items: [
    {
      id: 1,
      title: 'Netflix',
      cleanTitle: 'Netflix',
      category: 'Entertainment',
      amount: 186000,
      type: 'credit_expense',
      active: true,
      end_date: null,
      created_at: '1',
      isTemporary: false,
      isInstallment: false,
      totalTenor: null,
      currentTenor: null,
      remainingTenor: null,
      remainingLiability: null,
    },
    {
      id: 2,
      title: 'Kontrakan',
      cleanTitle: 'Kontrakan',
      category: 'Tagihan',
      amount: 1150000,
      type: 'cash',
      active: true,
      end_date: null,
      created_at: '4',
      isTemporary: false,
      isInstallment: false,
      totalTenor: null,
      currentTenor: null,
      remainingTenor: null,
      remainingLiability: null,
    },
    {
      id: 3,
      title: 'Cicilan Laptop (3/12)',
      cleanTitle: 'Laptop',
      category: 'Belanja Pribadi',
      amount: 1000000,
      type: 'credit_expense',
      active: true,
      end_date: '2027-07',
      created_at: '15',
      isTemporary: true,
      isInstallment: true,
      totalTenor: 12,
      currentTenor: 3,
      remainingTenor: 10,
      remainingLiability: 10000000,
    },
    {
      id: 4,
      title: 'Paused Gym',
      cleanTitle: 'Gym',
      category: 'Kesehatan',
      amount: 500000,
      type: 'cash',
      active: false,
      end_date: null,
      created_at: '10',
      isTemporary: false,
      isInstallment: false,
      totalTenor: null,
      currentTenor: null,
      remainingTenor: null,
      remainingLiability: null,
    },
  ],
  activeItems: [], // will populate below
  pausedItems: [],
  monthlyTotal: 2336000,
  annualTotal: 26032000,
  monthlyByCategory: {
    Entertainment: 186000,
    Tagihan: 1150000,
    'Belanja Pribadi': 1000000,
  },
  monthlyByType: {
    cash: 1150000,
    credit_expense: 1186000,
    credit_payment: 0,
  },
  categoryCount: 3,
  activeCount: 3,
  temporaryCount: 1,
  largestItem: {
    id: 2,
    title: 'Kontrakan',
    cleanTitle: 'Kontrakan',
    category: 'Tagihan',
    amount: 1150000,
    type: 'cash',
    active: true,
    end_date: null,
    created_at: '4',
    isTemporary: false,
    isInstallment: false,
    totalTenor: null,
    currentTenor: null,
    remainingTenor: null,
    remainingLiability: null,
  },
  avgPerItem: 778667,
  subscriptionMonthlyTotal: 1336000,
  installmentMonthlyTotal: 1000000,
  totalRemainingLiability: 10000000,
  postInstallmentRunRate: 1336000,
  installmentCount: 1,
  subscriptionCount: 2,
};
mockAnalysisResult.activeItems = mockAnalysisResult.items.filter((i) => i.active);
mockAnalysisResult.pausedItems = mockAnalysisResult.items.filter((i) => !i.active);

describe('RecurringCostAnalyzer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading indicator initially', () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => {})));
    render(<RecurringCostAnalyzer />);
    expect(screen.getByRole('status', { name: /loading recurring cost analysis/i })).toBeInTheDocument();
  });

  it('renders empty state when no items exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          items: [],
          activeItems: [],
          pausedItems: [],
          monthlyTotal: 0,
          annualTotal: 0,
          monthlyByCategory: {},
          monthlyByType: { cash: 0, credit_expense: 0, credit_payment: 0 },
          categoryCount: 0,
          activeCount: 0,
          temporaryCount: 0,
          largestItem: null,
          avgPerItem: 0,
        }),
      })
    );

    render(<RecurringCostAnalyzer />);
    await waitFor(() => {
      expect(screen.getByText('No recurring transactions found')).toBeInTheDocument();
    });
  });

  it('renders 4 summary cards: Monthly Total, Annual Cost, Subscriptions, Installments', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => mockAnalysisResult,
      })
    );

    render(<RecurringCostAnalyzer />);
    await waitFor(() => {
      expect(screen.getByText('Monthly Total')).toBeInTheDocument();
      expect(screen.getByText('Annual Cost')).toBeInTheDocument();
      expect(screen.getByText('Subscriptions')).toBeInTheDocument();
      expect(screen.getByText('Installments')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Rp 2.336.000').length).toBeGreaterThan(0); // Monthly total
    expect(screen.getAllByText('Rp 1.336.000').length).toBeGreaterThan(0); // Subscriptions total
    expect(screen.getAllByText('Rp 1.000.000').length).toBeGreaterThan(0); // Installments total
  });

  it('renders Post-Installment Cash Flow Relief banner when installments exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => mockAnalysisResult,
      })
    );

    render(<RecurringCostAnalyzer />);
    await waitFor(() => {
      expect(screen.getByText('Post-Installment Cash Flow Relief')).toBeInTheDocument();
    });

    expect(screen.getByText(/When all 1 active installments are paid off/i)).toBeInTheDocument();
    expect(screen.getByText('Run Rate: Rp 1.336.000/mo')).toBeInTheDocument();
    expect(screen.getByText('Remaining Debt: Rp 10.000.000')).toBeInTheDocument();
  });

  it('filters table and mobile list by Subscriptions and Installments tabs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => mockAnalysisResult,
      })
    );

    render(<RecurringCostAnalyzer />);
    await waitFor(() => {
      expect(screen.getByText('Subscriptions (2)')).toBeInTheDocument();
    });

    // Default: All active items (3)
    expect(screen.getAllByText('Kontrakan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Netflix').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cicilan Laptop (3/12)').length).toBeGreaterThan(0);

    // Switch to Subscriptions Only
    fireEvent.click(screen.getByText('Subscriptions (2)'));
    expect(screen.getAllByText('Kontrakan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Netflix').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cicilan Laptop (3/12)')).not.toBeInTheDocument();

    // Switch to Installments Only
    fireEvent.click(screen.getByText('Installments (1)'));
    expect(screen.getAllByText('Cicilan Laptop (3/12)').length).toBeGreaterThan(0);
    // Netflix (a subscription) should be filtered out from the list
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();

    // Switch back to All
    fireEvent.click(screen.getByText('All (3)'));
    expect(screen.getAllByText('Netflix').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cicilan Laptop (3/12)').length).toBeGreaterThan(0);
  });

  it('shows paused items when Show paused button is clicked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => mockAnalysisResult,
      })
    );

    render(<RecurringCostAnalyzer />);
    await waitFor(() => {
      expect(screen.getByText('Show paused (1)')).toBeInTheDocument();
    });

    expect(screen.queryByText('Paused Gym')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Show paused (1)'));
    expect(screen.getAllByText('Paused Gym').length).toBeGreaterThan(0);
    expect(screen.getByText('Show active only')).toBeInTheDocument();
  });
});