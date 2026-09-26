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

const updateCategoryApi = vi.fn();
const deleteCategoryApi = vi.fn();
const upsertMonthlyIncomeApi = vi.fn();
const updateMonthlyIncomeApi = vi.fn();

vi.mock('../lib/api', () => ({
  fetchCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategoryApi: (...a: any[]) => updateCategoryApi(...a),
  deleteCategoryApi: (...a: any[]) => deleteCategoryApi(...a),
  fetchMonthlyIncome: vi.fn(),
  upsertMonthlyIncomeApi: (...a: any[]) => upsertMonthlyIncomeApi(...a),
  updateMonthlyIncomeApi: (...a: any[]) => updateMonthlyIncomeApi(...a),
  deleteMonthlyIncomeApi: vi.fn(),
}));
vi.mock('../components/ConfirmDialog', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

import CategorySettings from '../components/CategorySettings';
import IncomeSettings from '../components/IncomeSettings';
import { fetchCategories, fetchMonthlyIncome } from '../lib/api';
import type { Category } from '../lib/data';
import type { MonthlyIncome } from '../lib/api';

const CATS: Category[] = [
  { id: 1, name: 'Food', color: '#22c55e', monthly_limit: 2000000 },
  { id: 2, name: 'Other', color: '#64748b', monthly_limit: 0 },
] as unknown as Category[];

const INCOMES: MonthlyIncome[] = [
  { month: 'August 2026', date: '2026-08-21', income: 15000000, other_income: 500000 },
  { month: 'September 2026', date: '2026-09-21', income: 16000000, other_income: 0 },
] as unknown as MonthlyIncome[];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchCategories).mockResolvedValue(CATS);
  vi.mocked(fetchMonthlyIncome).mockResolvedValue(INCOMES);
});

describe('CategorySettings — mobile card list', () => {
  it('renders mobile cards (color dot, name, limit) alongside desktop table', async () => {
    render(<CategorySettings />);
    // Table (desktop) + card list (mobile) both render → duplicates expected
    await waitFor(() => expect(screen.getAllByText('Food').length).toBe(2));
    expect(screen.getAllByText('Other').length).toBe(2);
    // Card limit line: formatIdr value, "No limit" for zero-limit cats
    expect(screen.getAllByText(/IDR 2\.000\.000/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('No limit').length).toBe(1); // card only; table uses '-'
  });

  it('mobile card Edit opens inline edit form; Save persists via API', async () => {
    render(<CategorySettings />);
    await waitFor(() => expect(screen.getAllByText('Food').length).toBe(2));
    // Desktop table renders first; the mobile card list Edit for "Food" is the one
    // inside the card container. Click ALL Edit buttons is unsafe — scope to the
    // card list by picking the edit whose row name is "Food": use the last Edit
    // of the FIRST category (table order = card order; first item's mobile Edit
    // is button index 1 [table], 3 [card] out of 4 total for 2 items).
    const foodEdit = screen.getAllByText('Edit')[2]; // [table-cat1, table-cat2, card-cat1, card-cat2]
    fireEvent.click(foodEdit);
    // Both table row edit AND card inline edit open (shared editingId) — pick card (last)
    const nameInputs = await screen.findAllByDisplayValue('Food');
    fireEvent.change(nameInputs[nameInputs.length - 1], { target: { value: 'Food & Drink' } });
    fireEvent.click(screen.getAllByText('Save')[screen.getAllByText('Save').length - 1]);
    await waitFor(() =>
      expect(updateCategoryApi).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ name: 'Food & Drink' }))
    );
  });

  it('mobile card Delete calls delete API after confirm', async () => {
    render(<CategorySettings />);
    await waitFor(() => expect(screen.getAllByText('Food').length).toBe(2));
    const delBtns = screen.getAllByText('Delete');
    fireEvent.click(delBtns[2]); // card-cat1 = Food
    await waitFor(() => expect(deleteCategoryApi).toHaveBeenCalledWith(1));
  });
});

describe('IncomeSettings — mobile card list', () => {
  it('renders mobile cards with month, breakdown meta, and total', async () => {
    render(<IncomeSettings />);
    await waitFor(() => expect(screen.getAllByText('August 2026').length).toBe(2));
    expect(screen.getAllByText('September 2026').length).toBe(2);
    // Card meta line
    expect(screen.getAllByText(/Income IDR 15\.000\.000 · Other IDR 500\.000/).length).toBe(1);
    // Total appears in table + card
    expect(screen.getAllByText('IDR 15.500.000').length).toBeGreaterThanOrEqual(2);
  });

  it('mobile card Edit opens inline form; Save updates income via API', async () => {
    render(<IncomeSettings />);
    await waitFor(() => expect(screen.getAllByText('August 2026').length).toBe(2));
    // [table-aug, table-sep, card-aug, card-sep]
    fireEvent.click(screen.getAllByText('Edit')[2]);
    // Inline card form inputs — table edit row also opens (shared state), pick last
    const inputs = await screen.findAllByDisplayValue('15000000');
    fireEvent.change(inputs[inputs.length - 1], { target: { value: '17000000' } });
    fireEvent.click(screen.getAllByText('Save')[screen.getAllByText('Save').length - 1]);
    await waitFor(() =>
      expect(updateMonthlyIncomeApi).toHaveBeenCalledWith('August 2026', expect.objectContaining({ income: 17000000 }))
    );
  });
});
