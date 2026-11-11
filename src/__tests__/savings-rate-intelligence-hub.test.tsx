/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  classifySavingsTier,
  computeMilestoneProgress,
  computeSavingsDecomposition,
  simulateSavingsTarget,
  generateSavingsInsights,
  extractAvailableYears,
  filterSavingsPeriods,
  type SavingsRatePeriod,
  type SavingsRateResult,
} from '../lib/savings-rate-engine';

vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: any) => (
    <div
      data-testid="mock-line-chart"
      data-points={data?.datasets?.[0]?.data?.length ?? 0}
    />
  ),
  Bar: ({ data }: any) => (
    <div
      data-testid="mock-bar-chart"
      data-points={data?.datasets?.[0]?.data?.length ?? 0}
    />
  ),
}));

import SavingsRateTracker from '../components/SavingsRateTracker';

function makePeriod(
  overrides: Partial<SavingsRatePeriod> & { period_id: number; month: string }
): SavingsRatePeriod {
  const income = overrides.income ?? 10_000_000;
  const invest = overrides.invest ?? 2_000_000;
  const outcome = overrides.outcome ?? 7_500_000;
  const living_expense = overrides.living_expense ?? Math.max(0, outcome - invest);
  const cash_surplus = overrides.cash_surplus ?? income - outcome;
  const savings = overrides.savings ?? income - living_expense;
  const savings_rate =
    overrides.savings_rate ??
    Math.round((savings / Math.max(1, income)) * 10000) / 100;
  const invest_rate =
    overrides.invest_rate ??
    Math.round((invest / Math.max(1, income)) * 10000) / 100;

  return {
    period_id: overrides.period_id,
    month: overrides.month,
    start_date: overrides.start_date ?? '2026-08-21',
    end_date: overrides.end_date ?? '2026-09-20',
    income,
    outcome,
    invest,
    living_expense,
    cash_surplus,
    savings,
    savings_rate,
    invest_rate,
    is_positive: savings >= 0,
  };
}

function makeSampleResult(): SavingsRateResult {
  const p1 = makePeriod({
    period_id: 1,
    month: 'August 2025',
    start_date: '2025-07-21',
    end_date: '2025-08-20',
    income: 10_000_000,
    outcome: 9_200_000,
    invest: 500_000,
  }); // living 8.7M -> savings 1.3M (13%)
  const p2 = makePeriod({
    period_id: 2,
    month: 'September 2026',
    start_date: '2026-08-21',
    end_date: '2026-09-20',
    income: 10_000_000,
    outcome: 7_500_000,
    invest: 2_000_000,
  }); // living 5.5M -> savings 4.5M (45%)
  const p3 = makePeriod({
    period_id: 3,
    month: 'October 2026',
    start_date: '2026-09-21',
    end_date: '2026-10-20',
    income: 12_000_000,
    outcome: 8_400_000,
    invest: 3_000_000,
  }); // living 5.4M -> savings 6.6M (55%)

  const periods = [p1, p2, p3];
  return {
    periods,
    current: p3,
    avg_rate: 37.67,
    median_rate: 45,
    best_rate: 55,
    worst_rate: 13,
    best_month: 'October 2026',
    worst_month: 'August 2025',
    positive_count: 3,
    negative_count: 0,
    total_periods: 3,
    consecutive_positive: 3,
    longest_positive_streak: 3,
    total_saved: 12_400_000,
    total_invested: 5_500_000,
    total_cash_surplus: 6_900_000,
    avg_invest_rate: 16.67,
    trailing3_avg: 37.67,
    trailing6_avg: 37.67,
    trend: 'stable',
  };
}

describe('savings-rate-engine domain logic', () => {
  it('classifies all 6 savings tiers and handles invalid rates safely', () => {
    expect(classifySavingsTier(-12).key).toBe('critical');
    expect(classifySavingsTier(4).key).toBe('building');
    expect(classifySavingsTier(15).key).toBe('fair');
    expect(classifySavingsTier(24).key).toBe('good');
    expect(classifySavingsTier(38).key).toBe('excellent');
    expect(classifySavingsTier(55).key).toBe('fire');
    expect(classifySavingsTier(Number.NaN).key).toBe('critical');
  });

  it('decomposes income into living expense, invest, and cash surplus', () => {
    const period = makePeriod({
      period_id: 10,
      month: 'October 2026',
      income: 10_000_000,
      outcome: 7_000_000,
      invest: 2_500_000,
    });
    // living_expense = 4.5M (45%), invest = 2.5M (25%), cash_surplus = 3M (30%), savings = 5.5M
    const decomp = computeSavingsDecomposition(period);
    expect(decomp.livingSharePct).toBe(45);
    expect(decomp.investSharePct).toBe(25);
    expect(decomp.cashSurplusSharePct).toBe(30);
    expect(decomp.investOfSavingsPct).toBeCloseTo(45.5, 1);
    expect(decomp.isDeficit).toBe(false);
  });

  it('simulates target rate gap, required expense cut, and compound accumulation', () => {
    // Base: 10M income, 8M living expense, 1M invest -> 20% baseline rate (2M savings)
    const simShortfall = simulateSavingsTarget({
      baseIncome: 10_000_000,
      baseLivingExpense: 8_000_000,
      baseInvest: 1_000_000,
      targetRatePct: 30,
      incomeAdjustPct: 0,
      expenseCutPct: 0,
      extraInvestMonthly: 0,
      annualReturnPct: 0,
    });
    expect(simShortfall.baselineRatePct).toBe(20);
    expect(simShortfall.simRatePct).toBe(20);
    expect(simShortfall.isTargetMet).toBe(false);
    expect(simShortfall.gapToTargetMonthly).toBe(-1_000_000);
    expect(simShortfall.requiredExpenseCutPct).toBe(12.5);
    expect(simShortfall.projected12MonthsBaseline).toBe(24_000_000);

    // Cut living expense by 20% -> 6.4M living expense -> 3.6M savings (36% rate -> meets 30%!)
    const simMet = simulateSavingsTarget({
      baseIncome: 10_000_000,
      baseLivingExpense: 8_000_000,
      baseInvest: 1_000_000,
      targetRatePct: 30,
      incomeAdjustPct: 0,
      expenseCutPct: 20,
      extraInvestMonthly: 500_000,
      annualReturnPct: 5,
    });
    expect(simMet.simRatePct).toBe(36);
    expect(simMet.isTargetMet).toBe(true);
    expect(simMet.gapToTargetMonthly).toBe(600_000);
    expect(simMet.projected12MonthsSim).toBeGreaterThan(3_600_000 * 12);
    expect(simMet.projected36MonthsSim).toBeGreaterThan(simMet.projected36MonthsBaseline);
  });

  it('computes milestone progress and generates em-dash-free Indonesian insights', () => {
    const prog = computeMilestoneProgress(35, 22);
    expect(prog.achievedCount).toBe(3); // 10, 20, 30
    expect(prog.nextMilestone?.rate).toBe(30);
    expect(prog.gapFromCurrentPct).toBe(8);

    const insights = generateSavingsInsights(makeSampleResult());
    expect(insights.length).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(insights)).not.toContain('—');
  });

  it('extracts years and filters periods by year, tier, and search query', () => {
    const res = makeSampleResult();
    expect(extractAvailableYears(res.periods)).toEqual(['2026', '2025']);
    expect(filterSavingsPeriods(res.periods, { year: '2025' })).toHaveLength(1);
    expect(filterSavingsPeriods(res.periods, { tier: 'fire' })).toHaveLength(1);
    expect(filterSavingsPeriods(res.periods, { search: 'september' })).toHaveLength(1);
  });
});

describe('SavingsRateTracker UI Hub', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/savings-rate');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading skeleton first and transitions to error + retry', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeSampleResult(),
      } as Response);

    render(<SavingsRateTracker />);
    expect(screen.getByTestId('savings-rate-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('savings-rate-error')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Coba Lagi/i }));
    await waitFor(() => {
      expect(screen.getAllByText('55.0%').length).toBeGreaterThanOrEqual(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('renders empty state with actionable links when no periods exist', async () => {
    const emptyResult: SavingsRateResult = {
      ...makeSampleResult(),
      periods: [],
      current: null,
      total_periods: 0,
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => emptyResult,
    } as Response);

    render(<SavingsRateTracker />);
    await waitFor(() => {
      expect(screen.getByTestId('savings-rate-empty')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Atur Pemasukan/i })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: /Catat Transaksi/i })).toHaveAttribute('href', '/add');
  });

  it('switches across Overview, Simulator Target, and History tabs without em-dashes', async () => {
    const sample = makeSampleResult();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => sample,
    } as Response);

    const { container } = render(<SavingsRateTracker />);

    await waitFor(() => {
      expect(screen.getAllByText('55.0%').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();

    // Switch to Simulator Target tab
    fireEvent.click(screen.getByRole('tab', { name: /Simulator Target/i }));
    expect(screen.getByTestId('savings-simulator-panel')).toBeInTheDocument();
    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();

    // Click 50% FIRE preset
    fireEvent.click(screen.getByRole('button', { name: /50% FIRE/i }));
    expect(screen.getByText(/Status Target 50%/i)).toBeInTheDocument();

    // Switch to History tab & filter
    fireEvent.click(screen.getByRole('tab', { name: /Riwayat & Rincian/i }));
    expect(screen.getByTestId('savings-history-panel')).toBeInTheDocument();

    const searchInput = screen.getByLabelText(/Cari periode/i);
    fireEvent.change(searchInput, { target: { value: 'September' } });
    expect(screen.getAllByText('September 2026').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('August 2025')).not.toBeInTheDocument();

    // Zero em-dashes rendered in DOM
    expect(container.textContent).not.toContain('—');
  });
});
