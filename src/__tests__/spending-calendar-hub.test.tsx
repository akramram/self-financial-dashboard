/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `IDR ${Math.round(n).toLocaleString('id-ID')}`,
  };
});

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (
    <div data-testid="dialog" data-open={open}>{open ? children : null}</div>
  ),
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<any>, {
          _selectedValue: value,
          _onValueChange: onValueChange,
        });
      })}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children, _selectedValue, _onValueChange }: any) => (
    <select
      data-testid="mock-select"
      value={_selectedValue}
      onChange={(e) => _onValueChange && _onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

import SpendingCalendar from '../components/SpendingCalendar';
import type { Transaction, Category } from '../lib/data';

const mockPeriods = [
  { period_id: 1, month: 'October 2026' },
];

const mockCategories: Category[] = [
  { id: 1, name: 'Food', color: '#10b981', monthly_limit: 2000000, created_at: '2026-01-01' },
  { id: 2, name: 'Transport', color: '#f59e0b', monthly_limit: 1000000, created_at: '2026-01-01' },
];

// In salary cycle for October 2026: spans Sep 21 to Oct 20
const mockTransactions: Transaction[] = [
  {
    id: 101,
    period_id: 1,
    month: 'October 2026',
    date: '2026-09-21',
    created_time: '2026-09-25T10:00:00.000Z',
    title: 'Grocery Superindo',
    category: 'Food',
    amount: 150000,
    currency: 'IDR',
    type: 'cash',
    payment_method: 'Cash',
    done: true,
  },
  {
    id: 102,
    period_id: 1,
    month: 'October 2026',
    date: '2026-09-21',
    created_time: '2026-09-25T14:30:00.000Z',
    title: 'Cafe Latte',
    category: 'Food',
    amount: 50000,
    currency: 'IDR',
    type: 'cash',
    payment_method: 'Cash',
    done: true,
  },
  {
    id: 103,
    period_id: 1,
    month: 'October 2026',
    date: '2026-09-21',
    created_time: '2026-10-05T08:00:00.000Z',
    title: 'MRT Ticket',
    category: 'Transport',
    amount: 25000,
    currency: 'IDR',
    type: 'cash',
    payment_method: 'Cash',
    done: true,
  },
  {
    id: 104,
    period_id: 1,
    month: 'October 2026',
    date: '2026-09-21',
    created_time: '2026-10-10T12:00:00.000Z',
    title: 'Gadget Store',
    category: 'Shopping',
    amount: 500000,
    currency: 'IDR',
    type: 'credit_expense',
    payment_method: 'Credit Card',
    done: false,
  },
];

describe('SpendingCalendar Hub & Heatmap Intelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all KPI overview cards with accurate calculations', () => {
    render(
      <SpendingCalendar
        transactions={mockTransactions}
        periods={mockPeriods}
        categories={mockCategories}
      />
    );

    // KPI Card Labels
    expect(screen.getByText('Period Spend')).toBeInTheDocument();
    expect(screen.getByText('Daily Average')).toBeInTheDocument();
    expect(screen.getByText('No-Spend Days')).toBeInTheDocument();
    expect(screen.getByText('Peak Day')).toBeInTheDocument();
    expect(screen.getByText('Weekend Spend')).toBeInTheDocument();
    expect(screen.getByText('Active Days')).toBeInTheDocument();

    // Total spend = 150k + 50k + 25k + 500k = 725,000 IDR
    expect(screen.getByText('IDR 725.000')).toBeInTheDocument();
    // 4 transactions in total
    expect(screen.getByText('4 transactions')).toBeInTheDocument();
  });

  it('renders day-of-week rhythm section', () => {
    render(
      <SpendingCalendar
        transactions={mockTransactions}
        periods={mockPeriods}
        categories={mockCategories}
      />
    );

    expect(screen.getByText('Day-of-Week Spending Rhythm')).toBeInTheDocument();
    // Weekdays are listed
    expect(screen.getAllByText('Mon').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Fri').length).toBeGreaterThanOrEqual(1);
  });

  it('filters transactions by category when category filter is changed', () => {
    render(
      <SpendingCalendar
        transactions={mockTransactions}
        periods={mockPeriods}
        categories={mockCategories}
      />
    );

    // Initial total is 725k
    expect(screen.getByText('IDR 725.000')).toBeInTheDocument();

    // Select Food category
    const categorySelect = screen.getAllByTestId('mock-select')[1];
    fireEvent.change(categorySelect, { target: { value: 'Food' } });

    // Food total is 150k + 50k = 200,000 IDR
    expect(screen.getAllByText('IDR 200.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2 transactions')).toBeInTheDocument();
  });

  it('filters transactions by payment type (Cash vs Credit)', () => {
    render(
      <SpendingCalendar
        transactions={mockTransactions}
        periods={mockPeriods}
        categories={mockCategories}
      />
    );

    // Select Credit Only (3rd select)
    const typeSelect = screen.getAllByTestId('mock-select')[2];
    fireEvent.change(typeSelect, { target: { value: 'credit' } });

    // Credit expense is 500k
    expect(screen.getAllByText('IDR 500.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1 transactions')).toBeInTheDocument();
  });

  it('toggles No-Spend Focus mode', () => {
    render(
      <SpendingCalendar
        transactions={mockTransactions}
        periods={mockPeriods}
        categories={mockCategories}
      />
    );

    const noSpendBtn = screen.getByText('No-Spend Focus');
    expect(noSpendBtn).toBeInTheDocument();

    fireEvent.click(noSpendBtn);
    // Button now has active background
    expect(noSpendBtn.className).toContain('bg-mint-600');
  });

  it('opens day detail dialog when a day with spending is clicked', () => {
    render(
      <SpendingCalendar
        transactions={mockTransactions}
        periods={mockPeriods}
        categories={mockCategories}
      />
    );

    // Day 25 has 2 transactions: Grocery Superindo (150k) and Cafe Latte (50k)
    const dayBtn = screen.getByLabelText(/2026-09-25: 2 transactions/i);
    expect(dayBtn).toBeInTheDocument();

    fireEvent.click(dayBtn);

    // Dialog should open
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Grocery Superindo')).toBeInTheDocument();
    expect(screen.getByText('Cafe Latte')).toBeInTheDocument();
    expect(screen.getByText('IDR 150.000')).toBeInTheDocument();
    expect(screen.getByText('IDR 50.000')).toBeInTheDocument();
  });

  it('dispatches quick-add-open custom event when clicking an empty day', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    render(
      <SpendingCalendar
        transactions={mockTransactions}
        periods={mockPeriods}
        categories={mockCategories}
      />
    );

    // Sep 22 has 0 transactions
    const emptyDayBtn = screen.getByLabelText(/2026-09-22: no transactions/i);
    expect(emptyDayBtn).toBeInTheDocument();

    fireEvent.click(emptyDayBtn);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'quick-add-open',
        detail: { date: '2026-09-22' },
      })
    );

    dispatchSpy.mockRestore();
  });

  it('resets filters when clicking Reset button', () => {
    render(
      <SpendingCalendar
        transactions={mockTransactions}
        periods={mockPeriods}
        categories={mockCategories}
      />
    );

    // Change category filter
    const categorySelect = screen.getAllByTestId('mock-select')[1];
    fireEvent.change(categorySelect, { target: { value: 'Food' } });

    expect(screen.getByText('Reset')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Reset'));

    // Should return to all
    expect(screen.getByText('IDR 725.000')).toBeInTheDocument();
  });
});
