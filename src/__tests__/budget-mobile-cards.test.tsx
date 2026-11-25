/**
 * @vitest-environment jsdom
 * @jest-dom
 *
 * Round 3 marathon — BudgetReport mobile UX regression:
 * category table is desktop-only now; <md gets a card list with 44px
 * keyboard-operable tap rows that open the drill-down dialog; status colors
 * keep AA shades; desktop rows gained focus-visible ring + Enter/Space.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/vitest';

vi.mock('../lib/api', () => ({
  fetchTransactions: vi.fn().mockResolvedValue([]),
}));

import BudgetReport from '../components/BudgetReport';
import type { MonthlySummary, Category } from '../lib/data';

const summaries = [
  {
    period_id: 1,
    month: '2026-09',
    date: '2026-09-01',
    income: 10_000_000,
    outcome: { total: 6_000_000 },
    savings: 4_000_000,
    savings_rate_pct: 40,
  } as unknown as MonthlySummary,
];

const categories: Category[] = [
  { id: 1, name: 'Food', color: '#10b981', monthly_limit: 2_000_000 } as Category,
  { id: 2, name: 'Transport', color: '#3b82f6', monthly_limit: 500_000 } as Category,
];

describe('BudgetReport — mobile card list', () => {
  it('renders mobile tap rows (role=button, focus ring) next to desktop table', () => {
    const { container } = render(<BudgetReport summaries={summaries} categories={categories} />);
    const mobileRows = container.querySelectorAll('[role="button"][tabindex="0"]');
    expect(mobileRows.length).toBeGreaterThanOrEqual(2);
    for (const row of Array.from(mobileRows)) {
      expect(row.className).toContain('focus-visible:ring-2');
      expect(row.className).toContain('active:bg-slate-100');
    }
  });

  it('desktop table rows are keyboard focusable (tabindex, ring class)', () => {
    const { container } = render(<BudgetReport summaries={summaries} categories={categories} />);
    const tableRows = container.querySelectorAll('table [tabindex="0"]');
    expect(tableRows.length).toBeGreaterThanOrEqual(2);
    for (const row of Array.from(tableRows)) {
      expect(row.className).toContain('focus-visible:ring-2');
    }
  });

  it('mobile rows show spent/limit and remaining with AA shades', () => {
    const { getAllByText } = render(<BudgetReport summaries={summaries} categories={categories} />);
    const foodMobile = getAllByText('Food').map((el) => el.closest('[role="button"]')).find(Boolean)!;
    expect(foodMobile).toBeInTheDocument();
    expect(foodMobile!.innerHTML).toContain('text-emerald-700');
    expect(foodMobile!.innerHTML).not.toContain('text-emerald-600');
  });
});
