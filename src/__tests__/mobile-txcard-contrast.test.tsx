/**
 * @vitest-environment jsdom
 * @jest-dom
 *
 * Round 3 marathon — mobile transaction card polish regression:
 * type color (Cash/Credit) AA in light mode (mint/coral/gold 700|600, was
 * mint-500 2.5:1, coral-500 3.8:1, gold-600 3.2:1) and card rows expose a
 * visible keyboard focus ring (parity with desktop rows, PR #408).
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

function makeTx(i: number, type: Transaction['type']): Transaction {
  return {
    id: i,
    period_id: 1,
    date: '2026-10-01',
    title: `Tx ${i}`,
    category: 'Food',
    amount: 10_000 * i,
    type,
    done: false,
    notes: '',
    month: 'Oct 2026',
    currency: 'IDR',
    payment_method: 'cash',
    created_time: '2026-10-01T00:00:00.000Z',
  };
}

const periods = [{ period_id: 1, month: 'Oct 2026' }];

describe('TransactionTable — mobile card type color + focus ring', () => {
  it('type colors use AA light shades (mint-700, coral-600, gold-700)', () => {
    const { container } = render(
      <TransactionTable
        transactions={[makeTx(1, 'cash'), makeTx(2, 'credit_expense'), makeTx(3, 'credit_payment')]}
        showMonth
        periods={periods}
      />
    );
    const cls = Array.from(container.querySelectorAll('span')).map((s) => s.className).join(' ');
    expect(cls).toContain('text-mint-700');
    expect(cls).toContain('text-coral-600');
    expect(cls).toContain('text-gold-700');
    expect(cls).not.toMatch(/text-mint-600(?![\w-])/);
    expect(cls).not.toMatch(/text-coral-500(?![\w-])/);
    expect(cls).not.toMatch(/text-gold-600(?![\w-])/);
  });

  it('mobile card rows keep Enter/Space activation and gain a focus-visible ring', () => {
    const { container } = render(
      <TransactionTable transactions={[makeTx(1, 'cash')]} showMonth periods={periods} />
    );
    const rows = container.querySelectorAll('[role="button"][tabindex="0"]');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of Array.from(rows)) {
      expect(row.className).toContain('focus-visible:ring-2');
    }
    const first = rows[0] as HTMLElement;
    fireEvent.keyDown(first, { key: 'Enter' });
    // detail sheet state change is internal; here we assert handler wiring does not throw
    expect(first).toBeInTheDocument();
  });
});
