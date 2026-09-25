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
  updateRecurringTransactionApi,
  fetchCategories,
  fetchGoals,
} from '../lib/api';
import type { RecurringTransaction } from '../lib/data';

const mkRec = (id: number, title: string, amount: number, over: Partial<RecurringTransaction> = {}): RecurringTransaction => ({
  id, title, category: 'Test', amount, type: 'cash', payment_method: 'Cash',
  done: false, active: true, created_at: '10', end_date: null,
  ...over,
} as unknown as RecurringTransaction);

const SAMPLE = [
  mkRec(1, 'Netflix', 54000, { goal_name: 'Fund Darurat' }),
  mkRec(2, 'Old Sub', 12000, { active: false, end_date: '2026-08' }),
];

beforeEach(() => {
  vi.mocked(fetchRecurringTransactions).mockResolvedValue(SAMPLE);
  vi.mocked(fetchCategories).mockResolvedValue([{ id: 1, name: 'Test', color: '#000', monthly_limit: 0 } as any]);
  vi.mocked(fetchGoals).mockResolvedValue([]);
});

describe('RecurringManager — mobile card list', () => {
  it('renders mobile cards with title, meta line, amount, and action buttons', async () => {
    render(<RecurringManager />);
    // Both table (desktop) and card list (mobile) render — expect duplicates
    await waitFor(() => expect(screen.getAllByText('Netflix').length).toBeGreaterThanOrEqual(2));
    expect(screen.getAllByText('IDR 54.000').length).toBeGreaterThanOrEqual(2);
    // Goal badge on mobile card
    expect(screen.getAllByText('Fund Darurat').length).toBeGreaterThanOrEqual(2);
    // Meta line: category · type · end date for inactive item (mobile card only)
    expect(screen.getByText(/Test · Cash · until 2026-08/)).toBeInTheDocument();
    const editBtns = screen.getAllByText('Edit');
    const deleteBtns = screen.getAllByText('Delete');
    expect(editBtns.length).toBeGreaterThanOrEqual(2); // table + cards
    expect(deleteBtns.length).toBeGreaterThanOrEqual(2);
  });

  it('toggles active via mobile card checkbox', async () => {
    render(<RecurringManager />);
    await waitFor(() => expect(screen.getAllByText('Netflix').length).toBeGreaterThanOrEqual(2));
    const checkbox = screen.getByRole('checkbox', { name: 'Toggle Netflix' });
    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(updateRecurringTransactionApi).toHaveBeenCalledWith(1, { active: false })
    );
  });

  it('opens inline edit form on mobile card and saves changes', async () => {
    render(<RecurringManager />);
    await waitFor(() => expect(screen.getAllByText('Netflix').length).toBeGreaterThanOrEqual(2));
    // Mobile card: find the div.px-4 container of the mobile card (not the table td)
    const allNetflix = screen.getAllByText('Netflix');
    const card = allNetflix.map((el) => el.closest('div.px-4')).find(Boolean)!;
    fireEvent.click([...card.querySelectorAll('button')].find((b) => b.textContent === 'Edit')!);
    // Inline mobile edit form appears (Title label visible in edit card)
    await waitFor(() => expect(screen.getAllByText('Title').length).toBeGreaterThan(0));
    // Save button on mobile form
    const saveBtn = screen.getAllByText('Save').find((b) => b.closest('div.px-4') !== null)!;
    fireEvent.click(saveBtn);
    await waitFor(() =>
      expect(updateRecurringTransactionApi).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'Netflix' }))
    );
  });
});
