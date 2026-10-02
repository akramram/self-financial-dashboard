/**
 * @vitest-environment jsdom
 * @jest-dom
 *
 * KUR-59 / FIN-016 polish (issue #287): sticky table headers, bounded scroll
 * wrappers, right-aligned tabular Rupiah columns, and 44px mobile touch targets.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/vitest';

// ─── Mock API layer (components fetch on mount) ──────────────────────────────

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
import NetworthTable from '../components/NetworthTable';
import type { Transaction } from '../lib/data';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeTx(i: number, done = false): Transaction {
  return {
    id: i,
    period_id: 1,
    date: '2026-10-01',
    title: `Tx ${i}`,
    category: 'Food',
    amount: 10000 * i,
    type: 'cash',
    done: !!done,
    notes: '',
    month: 'Oct 2026',
    currency: 'IDR',
    payment_method: 'cash',
    created_time: '2026-10-01T00:00:00.000Z',
  };
}

const periods = [{ period_id: 1, month: 'Oct 2026' }];

// ─── TransactionTable ────────────────────────────────────────────────────────

describe('TransactionTable — KUR-59 polish', () => {
  it('renders a sticky header inside a bounded scroll wrapper', () => {
    const { container } = render(
      <TransactionTable transactions={[makeTx(1)]} showMonth periods={periods} />
    );

    const table = container.querySelector('[data-testid="transactions-table"]');
    expect(table).not.toBeNull();

    // Wrapper div (single scroll container — sticky requires this)
    const wrapper = (table as HTMLElement).parentElement;
    expect(wrapper?.className).toContain('max-h-[70vh]');
    expect(wrapper?.className).toContain('overflow-y-auto');

    // Sticky header row
    const thead = container.querySelector('thead');
    expect(thead?.className).toContain('sticky');
    expect(thead?.className).toContain('top-0');
  });

  it('keeps amounts right-aligned with tabular numerals', () => {
    const { container } = render(
      <TransactionTable transactions={[makeTx(1)]} showMonth periods={periods} />
    );

    const amountCell = container.querySelector('td.tabular-nums.text-right');
    expect(amountCell).not.toBeNull();
    expect(amountCell?.textContent).toMatch(/10\.000|10,000/);
  });

  it('mobile paid/unpaid toggle meets the 44px touch target', () => {
    const { container } = render(
      <TransactionTable transactions={[makeTx(1)]} showMonth periods={periods} />
    );

    // Only the mobile card-list toggle carries an aria-label
    const mobileToggle = container.querySelector(
      'button[aria-label="Mark Tx 1 paid"]'
    );
    expect(mobileToggle).not.toBeNull();
    expect(mobileToggle!.className).toContain('min-h-[44px]');
    expect(mobileToggle!.className).toContain('min-w-[44px]');
  });

  it('renders the mobile card list rows (no horizontal scroll pattern)', () => {
    const { container } = render(
      <TransactionTable
        transactions={[makeTx(1), makeTx(2)]}
        showMonth
        periods={periods}
      />
    );

    const mobileRows = container.querySelectorAll('div[role="button"]');
    expect(mobileRows.length).toBe(2);
  });
});

// ─── NetworthTable ───────────────────────────────────────────────────────────

describe('NetworthTable — KUR-59 polish', () => {
  const networth = [
    { month: 'Sep 2026', total: 50_000_000, month_over_month_change: null, month_over_month_pct: null },
    { month: 'Oct 2026', total: 52_500_000, month_over_month_change: 2_500_000, month_over_month_pct: 5 },
  ];

  it('renders a sticky header inside a bounded scroll wrapper', () => {
    const { container } = render(<NetworthTable networth={networth as any} />);

    const table = container.querySelector('[data-testid="networth-table"]');
    expect(table).not.toBeNull();

    const wrapper = (table as HTMLElement).parentElement;
    expect(wrapper?.className).toContain('max-h-[70vh]');
    expect(wrapper?.className).toContain('overflow-y-auto');

    const thead = container.querySelector('thead');
    expect(thead?.className).toContain('sticky');
    expect(thead?.className).toContain('top-0');
  });

  it('keeps the Total column right-aligned with tabular numerals', () => {
    const { container } = render(<NetworthTable networth={networth as any} />);

    const totalCell = container.querySelector('td.tabular-nums.text-right');
    expect(totalCell).not.toBeNull();
    expect(totalCell?.textContent).toMatch(/52\.500\.000|52,500,000/);
  });

  it('mobile edit link meets the 44px touch target', () => {
    const { container } = render(<NetworthTable networth={networth as any} />);

    const editLinks = container.querySelectorAll('a[href^="/networth/edit"]');
    expect(editLinks.length).toBeGreaterThanOrEqual(2);

    const mobileLink = Array.from(editLinks).find((el) =>
      el.className.includes('min-h-[44px]')
    );
    expect(mobileLink).toBeDefined();
  });

  it('shows an empty state when there are no records', () => {
    const { container } = render(<NetworthTable networth={[]} />);

    expect(container.textContent).toContain('No networth records yet');
  });
});
