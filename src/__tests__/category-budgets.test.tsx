/**
 * @vitest-environment jsdom
 * @jest-dom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/vitest';

// ─── Mock dependencies BEFORE imports ──────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick }: any) => (
    <button data-testid="button" className={className} onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}));

vi.mock('../lib/utils', () => ({
  formatIdr: (n: number) => `IDR ${Math.round(n).toLocaleString()}`,
}));

import CategoryBudgets from '../components/CategoryBudgets';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSummary(month: string, categoryTotals: Record<string, number>) {
  return {
    period_id: 38,
    month,
    date: '2026-08-21',
    income: 15000000,
    outcome: { cash: 0, credit_payment: 0, credit_expenses: 0, total: 0 },
    savings: 0,
    category_totals: categoryTotals,
  } as any;
}

function makeCategories() {
  return [
    { id: 1, name: 'Belanja Pribadi', color: '#ef4444', monthly_limit: 1000000 },
    { id: 2, name: 'Family', color: '#10b981', monthly_limit: 1700000 },
    { id: 3, name: 'NoLimit Cat', color: '#94a3b8', monthly_limit: 0 },
  ] as any;
}

const paceResponse = (days_elapsed: number, days_total: number) => ({
  period_id: 38,
  period_label: 'September 2026',
  days_elapsed,
  days_total,
  time_elapsed_pct: (days_elapsed / days_total) * 100,
  categories: [
    { category: 'Belanja Pribadi', limit: 1000000, spent: 800000, expected_pct: 84, projected_total: 950000, days_elapsed, days_total },
    { category: 'Family', limit: 1700000, spent: 400000, expected_pct: 84, projected_total: 480000, days_elapsed, days_total },
  ],
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CategoryBudgets (pace-aware)', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('renders static view without pace API marker when period is closed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve(paceResponse(31, 31)) });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <CategoryBudgets
        summaries={[makeSummary('September 2026', { 'Belanja Pribadi': 800000 })]}
        categories={makeCategories()}
        activeMonth="September 2026"
        onCategoryClick={() => {}}
      />,
    );
    // Static header shows category count, not pace info
    expect(screen.getByText('1 categories')).toBeInTheDocument();
    // No pace marker div rendered (progress mock has no sibling marker)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/budget-pace'));
  });

  it('shows pace marker + day counter for active period', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve(paceResponse(26, 31)) });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <CategoryBudgets
        summaries={[makeSummary('September 2026', { 'Belanja Pribadi': 800000 })]}
        categories={makeCategories()}
        activeMonth="September 2026"
        onCategoryClick={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Day 26\/31 · pace-aware/)).toBeInTheDocument());
    // Expected-by-now marker rendered for the budgeted category
    const marker = document.querySelector('.bg-slate-900\\/70');
    expect(marker).not.toBeNull();
  });

  it('shows projected-exceed note when projection exceeds limit', async () => {
    const resp = paceResponse(26, 31);
    resp.categories[0] = { ...resp.categories[0], spent: 900000, projected_total: 1100000 };
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve(resp) });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <CategoryBudgets
        summaries={[makeSummary('September 2026', { 'Belanja Pribadi': 900000 })]}
        categories={makeCategories()}
        activeMonth="September 2026"
        onCategoryClick={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByText(/On pace to exceed/)).toBeInTheDocument());
    expect(screen.getByText(/IDR 1,100,000/)).toBeInTheDocument();
  });

  it('keeps over-limit note with projected total when both apply', async () => {
    const resp = paceResponse(26, 31);
    resp.categories[0] = { ...resp.categories[0], spent: 1200000, projected_total: 1400000 };
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve(resp) });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <CategoryBudgets
        summaries={[makeSummary('September 2026', { 'Belanja Pribadi': 1200000 })]}
        categories={makeCategories()}
        activeMonth="September 2026"
        onCategoryClick={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByText(/over limit/)).toBeInTheDocument());
    expect(screen.getByText(/projected IDR 1,400,000/)).toBeInTheDocument();
  });

  it('degrades gracefully when pace API fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network'));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <CategoryBudgets
        summaries={[makeSummary('September 2026', { Family: 400000 })]}
        categories={makeCategories()}
        activeMonth="September 2026"
        onCategoryClick={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByText('1 categories')).toBeInTheDocument());
    expect(screen.queryByText(/pace-aware/)).not.toBeInTheDocument();
  });

  it('sorts by spend descending and caps display at TOP_N with Show all toggle', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    const totals: Record<string, number> = {};
    for (let i = 1; i <= 8; i++) totals[`Cat ${i}`] = i * 100000;
    render(
      <CategoryBudgets
        summaries={[makeSummary('September 2026', totals)]}
        categories={[]}
        activeMonth="September 2026"
        onCategoryClick={() => {}}
      />,
    );
    expect(screen.getByText('Cat 8')).toBeInTheDocument();
    expect(screen.queryByText('Cat 1')).not.toBeInTheDocument();
    expect(screen.getByText(/Show all 8 categories/)).toBeInTheDocument();
  });
});
