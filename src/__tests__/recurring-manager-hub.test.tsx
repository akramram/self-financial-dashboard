/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `IDR ${n.toLocaleString('id-ID')}`,
  };
});
vi.mock('../lib/api', () => ({
  fetchRecurringTransactions: vi.fn(),
  createRecurringTransaction: vi.fn(),
  updateRecurringTransactionApi: vi.fn(),
  deleteRecurringTransactionApi: vi.fn(),
  fetchCategories: vi.fn(),
  fetchGoals: vi.fn(),
}));
vi.mock('./ConfirmDialog', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

import RecurringManager from '../components/RecurringManager';
import {
  fetchRecurringTransactions,
  fetchCategories,
  fetchGoals,
} from '../lib/api';
import type { RecurringTransaction } from '../lib/data';

const mkRec = (
  id: number,
  title: string,
  amount: number,
  over: Partial<RecurringTransaction> = {}
): RecurringTransaction =>
  ({
    id,
    title,
    category: 'Bills',
    amount,
    type: 'cash',
    payment_method: 'Cash',
    done: false,
    active: true,
    created_at: '21',
    end_date: null,
    ...over,
  } as unknown as RecurringTransaction);

const SAMPLE: RecurringTransaction[] = [
  mkRec(1, 'Kontrakan Rumah', 1500000, { type: 'cash', category: 'Rumah' }),
  mkRec(2, 'Cicilan Laptop', 800000, {
    type: 'credit_expense',
    category: 'Cicilan',
    end_date: '2026-12',
  }),
  mkRec(3, 'Tabungan Darurat', 500000, {
    type: 'cash',
    category: 'Investasi',
    goal_id: 10,
    goal_name: 'Emergency Fund',
  }),
  mkRec(4, 'Gym Subscription', 350000, {
    type: 'cash',
    category: 'Fitness',
    active: false,
  }),
];

beforeEach(() => {
  vi.mocked(fetchRecurringTransactions).mockResolvedValue(SAMPLE);
  vi.mocked(fetchCategories).mockResolvedValue([
    { id: 1, name: 'Rumah', color: '#000', monthly_limit: 0 } as any,
    { id: 2, name: 'Cicilan', color: '#000', monthly_limit: 0 } as any,
  ]);
  vi.mocked(fetchGoals).mockResolvedValue([
    { id: 10, name: 'Emergency Fund', target_amount: 10000000, current_amount: 2000000 } as any,
  ]);
});

describe('RecurringManager: Overview & Filter Hub', () => {
  it('renders summary glance cards with calculated totals for active items', async () => {
    render(<RecurringManager />);
    await waitFor(() => expect(screen.getAllByText('Kontrakan Rumah').length).toBeGreaterThan(0));

    // Active items: 1500000 (Kontrakan) + 800000 (Cicilan) + 500000 (Goal) = 2.800.000
    expect(screen.getByText('Total Bulanan Aktif')).toBeInTheDocument();
    expect(screen.getByText('IDR 2.800.000')).toBeInTheDocument();

    // Cash active: 1500000 + 500000 = 2.000.000
    expect(screen.getByText('Komitmen Cash')).toBeInTheDocument();
    expect(screen.getByText('IDR 2.000.000')).toBeInTheDocument();

    // Credit active: 800000
    expect(screen.getByText('Kewajiban Kredit')).toBeInTheDocument();
    expect(screen.getAllByText('IDR 800.000').length).toBeGreaterThanOrEqual(1);

    // Goal active: 500000
    expect(screen.getByText('Auto-Alokasi Goal')).toBeInTheDocument();
    expect(screen.getAllByText('IDR 500.000').length).toBeGreaterThanOrEqual(1);

    // Badge indicates 3 active, 1 paused
    expect(screen.getByText('3 Aktif')).toBeInTheDocument();
    expect(screen.getByText('1 Jeda')).toBeInTheDocument();
  });

  it('filters items in real time via search bar', async () => {
    render(<RecurringManager />);
    await waitFor(() => expect(screen.getAllByText('Kontrakan Rumah').length).toBeGreaterThan(0));

    const searchInput = screen.getByPlaceholderText('Cari judul / kategori...');
    fireEvent.change(searchInput, { target: { value: 'Laptop' } });

    // Laptop should be visible, others hidden
    expect(screen.getAllByText('Cicilan Laptop').length).toBeGreaterThan(0);
    expect(screen.queryByText('Kontrakan Rumah')).not.toBeInTheDocument();
    expect(screen.queryByText('Gym Subscription')).not.toBeInTheDocument();

    // Clearing search via clear button
    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearBtn);

    expect(screen.getAllByText('Kontrakan Rumah').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gym Subscription').length).toBeGreaterThan(0);
  });

  it('filters items by filter tab selection (Active, Paused, Credit, Goals)', async () => {
    render(<RecurringManager />);
    await waitFor(() => expect(screen.getAllByText('Kontrakan Rumah').length).toBeGreaterThan(0));

    // Click 'Paused' tab
    const pausedTab = screen.getByRole('button', { name: /Paused/i });
    fireEvent.click(pausedTab);

    // Only Gym Subscription is paused
    expect(screen.getAllByText('Gym Subscription').length).toBeGreaterThan(0);
    expect(screen.queryByText('Kontrakan Rumah')).not.toBeInTheDocument();
    expect(screen.queryByText('Cicilan Laptop')).not.toBeInTheDocument();

    // Click 'Credit' tab
    const creditTab = screen.getByRole('button', { name: /Credit/i });
    fireEvent.click(creditTab);

    expect(screen.getAllByText('Cicilan Laptop').length).toBeGreaterThan(0);
    expect(screen.queryByText('Gym Subscription')).not.toBeInTheDocument();

    // Click 'Goals' tab
    const goalsTab = screen.getByRole('button', { name: /Goals/i });
    fireEvent.click(goalsTab);

    expect(screen.getAllByText('Tabungan Darurat').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cicilan Laptop')).not.toBeInTheDocument();
  });

  it('shows empty filter state and resets correctly', async () => {
    render(<RecurringManager />);
    await waitFor(() => expect(screen.getAllByText('Kontrakan Rumah').length).toBeGreaterThan(0));

    const searchInput = screen.getByPlaceholderText('Cari judul / kategori...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentKeywordXYZ' } });

    expect(screen.getAllByText('Tidak ada transaksi recurring yang cocok dengan filter.').length).toBeGreaterThan(0);

    const resetBtns = screen.getAllByRole('button', { name: 'Reset Filter' });
    expect(resetBtns.length).toBeGreaterThan(0);
    fireEvent.click(resetBtns[0]);

    await waitFor(() => expect(screen.getAllByText('Kontrakan Rumah').length).toBeGreaterThan(0));
  });
});
