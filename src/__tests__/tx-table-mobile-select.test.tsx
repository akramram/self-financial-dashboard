/**
 * @vitest-environment jsdom
 * @jest-dom
 *
 * Mobile multi-select for the transaction card list: the desktop table has a
 * header checkbox, the <md card list had no selection surface at all, so bulk
 * category / paid / delete were unreachable on a phone.
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

/** Mobile card = checkbox role whose text carries the title (desktop has no row text in its checkbox). */
function mobileCard(getAllByRole: any, title: string) {
  return getAllByRole('checkbox').filter((el: HTMLElement) => el.textContent?.includes(title));
}

describe('TransactionTable — mobile multi-select', () => {
  it('exposes a Select toggle that flips to Done', () => {
    const { getByRole } = render(<TransactionTable transactions={[makeTx(1)]} periods={periods} />);
    const toggle = getByRole('button', { name: 'Select' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(getByRole('button', { name: 'Done' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('tapping a card in select mode toggles selection instead of opening detail', () => {
    const { getByRole, getAllByRole, getByText } = render(
      <TransactionTable transactions={[makeTx(1), makeTx(2)]} periods={periods} />
    );
    fireEvent.click(getByRole('button', { name: 'Select' }));

    const card = mobileCard(getAllByRole, 'Tx 1');
    expect(card).toHaveLength(1);
    expect(card[0]).toHaveAttribute('role', 'checkbox');
    expect(card[0]).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(card[0]);
    expect(card[0]).toHaveAttribute('aria-checked', 'true');
    expect(getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(card[0]);
    expect(card[0]).toHaveAttribute('aria-checked', 'false');
  });

  it('quick Paid button is hidden while selecting (no accidental status flips)', () => {
    const { getByRole, queryByRole } = render(<TransactionTable transactions={[makeTx(1)]} periods={periods} />);
    expect(queryByRole('button', { name: 'Mark Tx 1 paid' })).toBeInTheDocument();
    fireEvent.click(getByRole('button', { name: 'Select' }));
    expect(queryByRole('button', { name: 'Mark Tx 1 paid' })).toBeNull();
  });

  it('"All on page" selects every row and Done clears the mode', () => {
    const { getByRole, getByText, getAllByRole } = render(
      <TransactionTable transactions={[makeTx(1), makeTx(2)]} periods={periods} />
    );
    fireEvent.click(getByRole('button', { name: 'Select' }));
    fireEvent.click(getByRole('button', { name: 'All on page' }));
    expect(getByText('2 selected')).toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: 'Done' }));
    expect(getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'false');
    // selection cleared: cards leave checkbox role and none stays checked
    expect(getAllByRole('checkbox').filter((el) => el.getAttribute('aria-checked') === 'true')).toHaveLength(0);
  });
});
