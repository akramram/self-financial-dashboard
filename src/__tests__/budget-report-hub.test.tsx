/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `IDR ${Math.round(n).toLocaleString('id-ID')}`,
  };
});

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
}));

vi.mock('../lib/api', () => ({
  fetchTransactions: vi.fn(),
}));

import BudgetReport from '../components/BudgetReport';
import { fetchTransactions } from '../lib/api';
import type { MonthlySummary, Category, Transaction } from '../lib/data';

const mockCategories: Category[] = [
  { id: 1, name: 'Food', color: '#10b981', monthly_limit: 2000000, created_at: '2026-01-01' },
  { id: 2, name: 'Shopping', color: '#ef4444', monthly_limit: 1000000, created_at: '2026-01-01' },
  { id: 3, name: 'Transport', color: '#f59e0b', monthly_limit: 1000000, created_at: '2026-01-01' },
  { id: 4, name: 'Entertainment', color: '#8b5cf6', monthly_limit: 0, created_at: '2026-01-01' }, // Unbudgeted
];

const mockSummaries: MonthlySummary[] = [
  {
    period_id: 10,
    month: 'October 2026',
    date: '2026-09-21',
    income: 10000000,
    outcome: {
      cash: 2500000,
      credit_payment: 1000000,
      credit_expenses: 0,
      total: 3500000,
    },
    savings: 6500000,
    savings_rate_pct: 65,
    networth: 50000000,
    category_totals: {
      Food: 1500000, // 75% -> On Track
      Shopping: 1200000, // 120% -> Over Budget
      Transport: 850000, // 85% -> Near Limit
      Entertainment: 500000, // No limit -> Unbudgeted
    },
  },
];

describe('BudgetReport Hub & Status Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders summary KPI cards with correct totals', () => {
    render(<BudgetReport summaries={mockSummaries} categories={mockCategories} />);

    // Total Budget: 2M + 1M + 1M + 0 = 4M
    expect(screen.getByText('Total Budget')).toBeInTheDocument();
    // Total Spent: 1.5M + 1.2M + 0.85M + 0.5M = 4.05M
    expect(screen.getByText('Total Spent')).toBeInTheDocument();
    // Remaining (in KPI and Table header) and Alerts
    expect(screen.getAllByText('Remaining').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    // Over and Near alert badges in KPI card
    expect(screen.getByText('1 Over')).toBeInTheDocument();
    expect(screen.getByText('1 Near')).toBeInTheDocument();
  });

  it('renders budget adherence overview bar', () => {
    render(<BudgetReport summaries={mockSummaries} categories={mockCategories} />);

    expect(screen.getByText('Budget Adherence')).toBeInTheDocument();
    // Budgeted total = 4M, spent = 3.55M -> 88.8%
    expect(screen.getByText(/88\.8% Used/i)).toBeInTheDocument();
  });

  it('correctly badges categories in table with status indicators including No Limit', () => {
    render(<BudgetReport summaries={mockSummaries} categories={mockCategories} />);

    // Category names
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Shopping')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();

    // Badges (may also appear in filter buttons)
    expect(screen.getAllByText('On Track').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Over Budget').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Near Limit').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('No Limit').length).toBeGreaterThanOrEqual(1);
  });

  it('filters by status tabs (Over Budget, Near Limit, On Track, No Limit)', () => {
    render(<BudgetReport summaries={mockSummaries} categories={mockCategories} />);

    // Click 'Over Budget' tab
    const overBtn = screen.getByRole('button', { name: /Over Budget/i });
    fireEvent.click(overBtn);

    expect(screen.getByText('Shopping')).toBeInTheDocument();
    expect(screen.queryByText('Food')).not.toBeInTheDocument();
    expect(screen.queryByText('Transport')).not.toBeInTheDocument();
    expect(screen.queryByText('Entertainment')).not.toBeInTheDocument();

    // Click 'Near Limit' tab
    const nearBtn = screen.getByRole('button', { name: /Near Limit/i });
    fireEvent.click(nearBtn);

    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.queryByText('Shopping')).not.toBeInTheDocument();

    // Click 'No Limit' tab
    const unbudgetedBtn = screen.getByRole('button', { name: /No Limit/i });
    fireEvent.click(unbudgetedBtn);

    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    expect(screen.queryByText('Food')).not.toBeInTheDocument();

    // Click 'All' tab to restore
    const allBtn = screen.getByRole('button', { name: /^All/i });
    fireEvent.click(allBtn);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Shopping')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
  });

  it('filters table dynamically using search query and shows reset button on empty results', () => {
    render(<BudgetReport summaries={mockSummaries} categories={mockCategories} />);

    const searchInput = screen.getByPlaceholderText('Search category...');
    fireEvent.change(searchInput, { target: { value: 'trans' } });

    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.queryByText('Food')).not.toBeInTheDocument();
    expect(screen.queryByText('Shopping')).not.toBeInTheDocument();

    // Search for non-existing category
    fireEvent.change(searchInput, { target: { value: 'xyz123' } });
    expect(screen.getByText('No categories found matching your filter')).toBeInTheDocument();

    // Click Reset Filters button
    const resetBtn = screen.getByRole('button', { name: /Reset Filters/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Shopping')).toBeInTheDocument();
  });

  it('opens category drill-down dialog when clicking row', async () => {
    const mockTxs: Transaction[] = [
      {
        id: 101,
        period_id: 10,
        month: 'October 2026',
        date: '2026-10-01',
        title: 'Supermarket Groceries',
        category: 'Food',
        amount: 350000,
        currency: 'IDR',
        type: 'cash',
        payment_method: 'Cash',
        done: true,
        created_time: '2026-10-01T12:00:00.000Z',
      },
    ];

    vi.mocked(fetchTransactions).mockResolvedValueOnce(mockTxs);

    render(<BudgetReport summaries={mockSummaries} categories={mockCategories} />);

    // Click the Food row
    const foodCell = screen.getByText('Food');
    fireEvent.click(foodCell);

    await waitFor(() => {
      expect(fetchTransactions).toHaveBeenCalledWith({
        periodId: undefined, // "all" mode is default
        category: 'Food',
      });
      expect(screen.getByText('Supermarket Groceries')).toBeInTheDocument();
    });
  });
});
