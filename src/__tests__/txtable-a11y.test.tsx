/**
 * @vitest-environment jsdom
 * @jest-dom
 *
 * A11y/contrast regression for TransactionTable (round 2 marathon):
 * named remove buttons on advanced filter badges (was 10px icon-only),
 * AA-contrast "clear" action + empty state in dark AND light mode.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/vitest';

vi.mock('../lib/api', () => ({
  updateTransactionApi: vi.fn().mockResolvedValue({ ok: true }),
  deleteTransactionApi: vi.fn().mockResolvedValue({ ok: true }),
  toggleTransactionDoneApi: vi.fn().mockResolvedValue({ ok: true }),
  repeatTransactionApi: vi.fn().mockResolvedValue({ ok: true }),
  deleteTransactionsBulkApi: vi.fn().mockResolvedValue({ ok: true }),
  updateTransactionsBulkApi: vi.fn().mockResolvedValue({ ok: true }),
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchTransactions: vi.fn().mockResolvedValue([]),
}));

import TransactionTable from '../components/TransactionTable';
import type { Transaction } from '../lib/data';

function makeTx(i: number): Transaction {
  return {
    id: i,
    period_id: 1,
    date: '2026-10-01',
    title: `Tx ${i}`,
    category: 'Food',
    amount: 10000 * i,
    type: 'cash',
    done: false,
    notes: '',
    month: 'Oct 2026',
    currency: 'IDR',
    payment_method: 'cash',
    created_time: '2026-10-01T00:00:00.000Z',
  };
}

const periods = [{ period_id: 1, month: 'Oct 2026' }];

describe('TransactionTable — a11y/contrast regression', () => {
  it('advanced filter badges expose named remove buttons with 12px icons', () => {
    window.history.replaceState(null, '', '/?dateFrom=2026-01-01&dateTo=2026-01-31&amountMin=1000&amountMax=9000');
    const { getByRole } = render(
      <TransactionTable transactions={[makeTx(1)]} showMonth periods={periods} />
    );

    for (const name of ['Remove From date filter', 'Remove To date filter', 'Remove min amount filter', 'Remove max amount filter']) {
      const btn = getByRole('button', { name });
      // Icon bumped from 10px (w-2.5) to 12px (w-3) + padded tap area
      expect(btn.querySelector('svg')!.getAttribute('class')).toContain('w-3');
      expect(btn.className).toContain('p-1');
    }
  });

  it('search clear button has an accessible name', () => {
    window.history.replaceState(null, '', '/?search=kopi');
    const { getByRole } = render(
      <TransactionTable transactions={[makeTx(1)]} showMonth periods={periods} />
    );
    expect(getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
  });

  it('"Clear all filters" passes AA in light mode (emerald-700) with dark variant kept', () => {
    window.history.replaceState(null, '', '/?search=zzz');
    const { getAllByRole } = render(
      <TransactionTable transactions={[makeTx(1)]} showMonth periods={periods} />
    );
    // Desktop table + mobile card list both render it
    const btns = getAllByRole('button', { name: 'Clear all filters' });
    expect(btns.length).toBeGreaterThanOrEqual(1);
    for (const btn of btns) {
      expect(btn.className).toContain('text-emerald-700');
      expect(btn.className).toContain('dark:text-emerald-400');
      // no bare (light-mode) emerald-400 text color
      expect(btn.className).not.toMatch(/(^| )text-emerald-400( |$)/);
    }
  });

  it('empty state drops the AA-failing dark:text-white/25 shade', () => {
    window.history.replaceState(null, '', '/');
    const { container, getAllByText } = render(
      <TransactionTable transactions={[]} showMonth periods={periods} />
    );
    expect(getAllByText('No transactions found').length).toBeGreaterThanOrEqual(2);
    const cell = container.querySelector('td.text-center');
    expect(cell?.className).toContain('dark:text-white/60');
    expect(cell?.className).not.toContain('dark:text-white/25');
    // Mobile card list empty state too
    const mobileEmpty = container.querySelector('.md\\:hidden > div');
    expect(mobileEmpty?.className).toContain('dark:text-white/60');
  });

  it('filter inputs have accessible names and result regions announce changes', () => {
    window.history.replaceState(null, '', '/');
    const { getByLabelText, getByRole, container } = render(
      <TransactionTable transactions={[makeTx(1)]} showMonth periods={periods} />
    );
    expect(getByLabelText('Search transactions')).toBeInTheDocument();

    // Open advanced panel: date + amount inputs must be labeled
    fireEvent.click(getByRole('button', { name: /Advanced Filters/i }));
    expect(getByLabelText('Filter date from')).toBeInTheDocument();
    expect(getByLabelText('Filter date to')).toBeInTheDocument();
    expect(getByLabelText('Filter minimum amount (Rupiah)')).toBeInTheDocument();
    expect(getByLabelText('Filter maximum amount (Rupiah)')).toBeInTheDocument();

    // Summary bar + pagination are live regions
    expect(container.querySelectorAll('[aria-live="polite"]').length).toBeGreaterThanOrEqual(2);
  });

  it('paid/unpaid chips and row toggles keep light-mode-safe color pairs', () => {
    window.history.replaceState(null, '', '/');
    const { container } = render(
      <TransactionTable transactions={[makeTx(1)]} showMonth periods={periods} />
    );
    const html = container.innerHTML;
    // No bare 400-shade text colors left on light backgrounds in this component
    expect(html).not.toMatch(/bg-red-500\/10 text-red-400/);
    expect(html).not.toMatch(/text-emerald-400 hover:text-emerald-300/);
    // Desktop type badge got its light-mode shade
    expect(html).toContain('text-mint-600 dark:text-mint-400');
  });
});
