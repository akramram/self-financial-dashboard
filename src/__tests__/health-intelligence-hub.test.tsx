/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { computeHealthSummary, simulateHealthScore } from '../lib/health-engine';
import type { MonthlySummary, Category, NetworthRecord } from '../lib/data';

vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: any) => (
    <div data-testid="mock-line-chart" data-points={data?.datasets?.[0]?.data?.length ?? 0} />
  ),
  Radar: ({ data }: any) => (
    <div data-testid="mock-radar-chart" data-axes={data?.labels?.length ?? 0} />
  ),
}));

import HealthScore from '../components/HealthScore';

function makeSummary(overrides: Partial<MonthlySummary> & { period_id: number; month: string }): MonthlySummary {
  return {
    period_id: overrides.period_id,
    month: overrides.month,
    date: overrides.date ?? '2026-08-21',
    income: overrides.income ?? 10_000_000,
    outcome: overrides.outcome ?? {
      cash: 4_000_000,
      credit_payment: 1_000_000,
      credit_expenses: 0,
      total: 5_000_000,
    },
    invest_total: overrides.invest_total ?? 0,
    savings: overrides.savings ?? 5_000_000,
    savings_rate_pct: overrides.savings_rate_pct ?? 50,
    networth: overrides.networth ?? 100_000_000,
    category_totals: overrides.category_totals ?? { Food: 2_000_000, Transport: 1_000_000 },
  };
}

const SAMPLE_CATEGORIES: Category[] = [
  { id: 1, name: 'Food', color: '#10b981', monthly_limit: 2_500_000, created_at: '2026-01-01' },
  { id: 2, name: 'Transport', color: '#3b82f6', monthly_limit: 1_500_000, created_at: '2026-01-01' },
];

const SAMPLE_NETWORTH: NetworthRecord[] = [
  {
    period_id: 1,
    month: 'August 2026',
    date: '2026-08-21',
    total: 100_000_000,
    currency: 'IDR',
    month_over_month_change: null,
    month_over_month_pct: null,
    breakdown: {},
  },
  {
    period_id: 2,
    month: 'September 2026',
    date: '2026-09-21',
    total: 106_000_000,
    currency: 'IDR',
    month_over_month_change: 6_000_000,
    month_over_month_pct: 6,
    breakdown: {},
  },
  {
    period_id: 3,
    month: 'October 2026',
    date: '2026-10-21',
    total: 112_000_000,
    currency: 'IDR',
    month_over_month_change: 6_000_000,
    month_over_month_pct: 5.66,
    breakdown: {},
  },
];

describe('health-engine domain logic', () => {
  it('excludes invest_total from Spending Control consumption and computes real prevScore consistency', () => {
    // Month 1-3: 10M income, 7M total outcome INCLUDING 3M Invest -> net consumption = 4M (40% of income -> 20/20!)
    const summaries: MonthlySummary[] = [
      makeSummary({
        period_id: 1,
        month: 'August 2026',
        income: 10_000_000,
        outcome: { cash: 7_000_000, credit_payment: 0, credit_expenses: 0, total: 7_000_000 },
        invest_total: 3_000_000,
        savings: 6_000_000,
        savings_rate_pct: 60,
      }),
      makeSummary({
        period_id: 2,
        month: 'September 2026',
        income: 10_000_000,
        outcome: { cash: 7_000_000, credit_payment: 0, credit_expenses: 0, total: 7_000_000 },
        invest_total: 3_000_000,
        savings: 6_000_000,
        savings_rate_pct: 60,
      }),
      makeSummary({
        period_id: 3,
        month: 'October 2026',
        income: 10_000_000,
        outcome: { cash: 7_000_000, credit_payment: 0, credit_expenses: 0, total: 7_000_000 },
        invest_total: 3_000_000,
        savings: 6_000_000,
        savings_rate_pct: 60,
      }),
    ];

    const res = computeHealthSummary({
      summaries,
      categories: SAMPLE_CATEGORIES,
      networth: SAMPLE_NETWORTH,
    });

    expect(res).not.toBeNull();
    const spendFactor = res!.factors.find((f) => f.name === 'Spending Control');
    expect(spendFactor?.score).toBe(20);
    expect(spendFactor?.label).toBe('40% dari income');

    // prevScore should match history[1].score (consistency=12 for 2 months, NOT hardcoded 10)
    expect(res!.prevScore).toBe(res!.history[1].score);
    expect(res!.overall).toBe(100);
    expect(res!.grade).toBe('A+');

    // Zero em-dashes in engine output
    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain('—');
  });

  it('ranks prescriptions by potentialGain and simulates What-If score lift accurately', () => {
    const summaries: MonthlySummary[] = [
      makeSummary({
        period_id: 1,
        month: 'August 2026',
        income: 10_000_000,
        outcome: { cash: 8_500_000, credit_payment: 0, credit_expenses: 0, total: 8_500_000 },
        savings: 1_500_000,
        savings_rate_pct: 15,
        category_totals: { Food: 3_500_000, Transport: 2_000_000 }, // both over budget!
      }),
      makeSummary({
        period_id: 2,
        month: 'September 2026',
        income: 10_000_000,
        outcome: { cash: 9_000_000, credit_payment: 0, credit_expenses: 0, total: 9_000_000 },
        savings: 1_000_000,
        savings_rate_pct: 10,
        category_totals: { Food: 3_500_000, Transport: 2_000_000 }, // both over budget
      }),
    ];

    const res = computeHealthSummary({
      summaries,
      categories: SAMPLE_CATEGORIES,
      networth: SAMPLE_NETWORTH,
    })!;

    expect(res.prescriptions.length).toBeGreaterThan(0);
    for (let i = 1; i < res.prescriptions.length; i++) {
      expect(res.prescriptions[i - 1].potentialGain).toBeGreaterThanOrEqual(
        res.prescriptions[i].potentialGain
      );
    }

    const sim = simulateHealthScore(res.rawContext, res.factors, {
      extraMonthlySavings: 3_000_000,
      resolvedOverBudgetCount: 2,
      targetNwGrowthPct: 6,
    });

    expect(sim.overall).toBeGreaterThan(res.overall);
    expect(sim.delta).toBe(sim.overall - res.overall);
    const budgetSim = sim.factors.find((f) => f.name === 'Budget Adherence');
    expect(budgetSim?.simulatedScore).toBe(20);
  });
});

describe('HealthScore Hub Component', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/');
  });

  function buildSampleResult() {
    const summaries: MonthlySummary[] = [
      makeSummary({
        period_id: 1,
        month: 'August 2026',
        income: 10_000_000,
        outcome: { cash: 6_000_000, credit_payment: 0, credit_expenses: 0, total: 6_000_000 },
        savings: 4_000_000,
        savings_rate_pct: 40,
      }),
      makeSummary({
        period_id: 2,
        month: 'September 2026',
        income: 10_000_000,
        outcome: { cash: 8_500_000, credit_payment: 0, credit_expenses: 0, total: 8_500_000 },
        savings: 1_500_000,
        savings_rate_pct: 15,
        category_totals: { Food: 3_200_000, Transport: 1_200_000 },
      }),
    ];
    return computeHealthSummary({
      summaries,
      categories: SAMPLE_CATEGORIES,
      networth: SAMPLE_NETWORTH,
    })!;
  }

  beforeEach(() => {
    window.history.replaceState({}, '', '/health');
  });

  it('shows error state with Retry button and recovers when clicked', async () => {
    const sample = buildSampleResult();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'DB offline' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => sample });
    globalThis.fetch = fetchMock as any;

    render(<HealthScore />);

    await waitFor(() => {
      expect(screen.getByText('Gagal Memuat Skor Kesehatan Finansial')).toBeInTheDocument();
    });
    expect(screen.getByText('DB offline')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Coba Lagi/i }));

    await waitFor(() => {
      expect(screen.getByText('Radar Keseimbangan 5 Pilar')).toBeInTheDocument();
    });
  });

  it('renders 5-factor hub, radar + trend charts, simulator tab, and history tab with zero em-dashes', async () => {
    const sample = buildSampleResult();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sample,
    });
    globalThis.fetch = fetchMock as any;

    const { container } = render(<HealthScore />);

    await waitFor(() => {
      expect(screen.getByText('Radar Keseimbangan 5 Pilar')).toBeInTheDocument();
    });

    // Charts and 5 pillars present
    expect(screen.getByTestId('mock-radar-chart')).toHaveAttribute('data-axes', '5');
    expect(screen.getByTestId('mock-line-chart')).toHaveAttribute('data-points', '2');
    expect(screen.getAllByText('Savings Rate').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Budget Adherence').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Rencana Aksi Prioritas (Urut Potensi Poin Tertinggi)')).toBeInTheDocument();

    // Switch to Simulator Skor tab
    fireEvent.click(screen.getByRole('tab', { name: /Simulator Skor/i }));
    expect(screen.getByText('Simulator Kenaikan Skor (What-If Booster)')).toBeInTheDocument();

    // Apply +Rp 2,5 Jt Tabungan preset and check projected score rises
    fireEvent.click(screen.getByRole('button', { name: /\+Rp 2,5 Jt Tabungan/i }));
    expect(screen.getByText(/Proyeksi Simulasi \(\+/i)).toBeInTheDocument();

    // Switch to Riwayat & Metodologi tab
    fireEvent.click(screen.getByRole('tab', { name: /Riwayat & Metodologi/i }));
    expect(screen.getByText('Riwayat Skor per Siklus Gaji')).toBeInTheDocument();
    expect(screen.getByText('Metodologi Penilaian 5 Pilar (Total 100 Poin)')).toBeInTheDocument();

    // Zero em-dashes anywhere in rendered HTML
    expect(container.textContent || '').not.toContain('—');
  });
});
