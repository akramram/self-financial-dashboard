/**
 * @vitest-environment jsdom
 * @jest-dom
 *
 * Contrast regression for DashboardSummaryCards delta row (round 3 marathon):
 * delta/deltaPct used emerald-500/70 (~1.9:1 on white) and red-500/70
 * (~2.6:1); must use full-shade AA pairs. Icons are decorative (aria-hidden).
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/vitest';

import DashboardSummaryCards from '../components/DashboardSummaryCards';
import type { MonthlySummary, NetworthRecord } from '../lib/data';

function makeSummary(month: string, income: number, outcome: number): MonthlySummary {
  return {
    period_id: 1,
    month,
    date: `${month}-01`,
    income,
    outcome: { total: outcome },
  } as unknown as MonthlySummary;
}

const networth: NetworthRecord[] = [
  { period_id: 1, month: '2026-08', date: '2026-08-01', total: 50_000_000, currency: 'IDR', month_over_month_change: null, month_over_month_pct: null, breakdown: {} },
  { period_id: 2, month: '2026-09', date: '2026-09-01', total: 52_000_000, currency: 'IDR', month_over_month_change: 2_000_000, month_over_month_pct: 4, breakdown: {} },
];

const POS = 'text-emerald-700 dark:text-emerald-400';
const NEG = 'text-red-600 dark:text-red-400';
const FADED = [/emerald-500\/70/, /red-500\/70/, /emerald-400\/70/, /red-400\/70/];

function classes(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('span')).map((s) => s.className);
}

describe('DashboardSummaryCards — contrast regression', () => {
  it('positive deltas use AA emerald-700/dark:emerald-400, no faded /70 text', () => {
    // Income up, Spending down → all isPositive
    const summaries = [
      makeSummary('2026-08', 9_000_000, 7_000_000),
      makeSummary('2026-09', 10_000_000, 6_000_000),
    ];
    const { container } = render(
      <DashboardSummaryCards summaries={summaries} networth={networth} activeMonth="2026-09" />
    );
    const cls = classes(container).join(' ');
    expect(cls).toContain(POS);
    for (const re of FADED) expect(cls).not.toMatch(re);
  });

  it('negative deltas (spending up) use AA red-600/dark:red-400', () => {
    // Spending up 6M -> 7M → isPositive false → red branch
    const summaries = [
      makeSummary('2026-08', 10_000_000, 6_000_000),
      makeSummary('2026-09', 10_000_000, 7_000_000),
    ];
    const { container } = render(
      <DashboardSummaryCards summaries={summaries} networth={networth} activeMonth="2026-09" />
    );
    const cls = classes(container).join(' ');
    expect(cls).toContain(NEG);
    for (const re of FADED) expect(cls).not.toMatch(re);
  });

  it('card icons are decorative (aria-hidden)', () => {
    const summaries = [
      makeSummary('2026-08', 9_000_000, 7_000_000),
      makeSummary('2026-09', 10_000_000, 6_000_000),
    ];
    const { container } = render(
      <DashboardSummaryCards summaries={summaries} networth={networth} activeMonth="2026-09" />
    );
    const hidden = container.querySelectorAll('span[aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThanOrEqual(4);
  });
});
