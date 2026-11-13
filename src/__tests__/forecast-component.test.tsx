/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Forecast from '../components/Forecast';

vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: any) => (
    <div
      data-testid="mock-line-chart"
      data-datasets={data?.datasets?.length ?? 0}
      data-labels={data?.labels?.length ?? 0}
    />
  ),
  Bar: ({ data }: any) => (
    <div
      data-testid="mock-bar-chart"
      data-datasets={data?.datasets?.length ?? 0}
    />
  ),
  Doughnut: ({ data }: any) => (
    <div
      data-testid="mock-doughnut-chart"
      data-datasets={data?.datasets?.length ?? 0}
    />
  ),
}));

const mockForecastResponse = {
  allMonths: ['September 2026', 'October 2026'],
  forecast: {
    month: 'October 2026',
    period_id: 2,
    income: 10000000,
    investTotal: 2000000,
    daysElapsed: 10,
    periodLength: 30,
    daysRemaining: 20,
    totalSpent: 2500000,
    totalUnpaid: 500000,
    unpaidCount: 2,
    dailyAvg: 250000,
    projectedTotal: 7500000,
    projectionConfidence: 'medium',
    velocityVsHistory: 5,
    targetCeiling: 7000000,
    budgetStatus: [
      {
        category: 'Makan',
        color: '#ef4444',
        spent: 1000000,
        projected: 3000000,
        limit: 2500000,
        spentPct: 40,
        projectedPct: 120,
        status: 'critical',
        remaining: 1500000,
      },
    ],
    categoryBurnTimeline: [
      {
        category: 'Makan',
        color: '#ef4444',
        spent: 1000000,
        limit: 2500000,
        remaining: 1500000,
        spentPct: 40,
        dailyAvg: 100000,
        daysToExhaust: 15,
        isAlreadyExhausted: false,
        projectedExhaustionDay: 25,
        status: 'danger',
        statusLabel: 'Akan Jebol',
      },
    ],
    multiModel: {
      models: [
        {
          id: 'regression',
          name: 'Momentum Regresi OLS',
          labelId: 'Regresi Trend',
          description: 'Regresi tren',
          projectedTotal: 7500000,
          projectedEomDate: 'Akhir Periode',
          deltaVsBase: 0,
          confidence: 'medium',
        },
        {
          id: 'linear_pace',
          name: 'Pace Harian Konstan',
          labelId: 'Run-Rate Harian',
          description: 'Pace harian konstan',
          projectedTotal: 7500000,
          projectedEomDate: 'Akhir Periode',
          deltaVsBase: 0,
          confidence: 'medium',
        },
      ],
      baselineModelId: 'regression',
      baselineProjected: 7500000,
      coneOfUncertainty: {
        lowerBound: 6500000,
        upperBound: 8500000,
        spread: 2000000,
      },
    },
    safeDailyAllowance: {
      targetCeiling: 7000000,
      currentSpent: 2500000,
      daysRemaining: 20,
      dailyAllowance: 225000,
      currentDailyAvg: 250000,
      diffVsCurrentDaily: -25000,
      pctOfCurrentDaily: 90,
      feasibility: 'manageable',
      feasibilityLabel: 'Terkendali',
      feasibilityDescription: 'Kuota belanja harian sebanding dengan ritme.',
    },
    eomSavings: {
      income: 10000000,
      investTotal: 2000000,
      projectedOutflow: 7500000,
      projectedLivingExpense: 5500000,
      projectedSavings: 4500000,
      projectedSavingsRatePct: 45,
      status: 'excellent',
      statusLabel: 'Sangat Optimal',
      statusAdvice: 'Tingkat tabungan sangat sehat.',
    },
    creditStatus: {
      creditExpenses: 1500000,
      creditPayments: 1000000,
      outstanding: 500000,
      utilizationPct: 33.3,
      unpaidCredit: 0,
      unpaidPayments: 0,
    },
    cumulative: [
      { day: '2026-10-21', amount: 250000, cumulative: 250000 },
      { day: '2026-10-22', amount: 300000, cumulative: 550000 },
    ],
    projectedTrajectory: [
      { day: '2026-10-23', cumulative: 800000 },
    ],
    recentMonthly: [
      { month: 'September 2026', total: 6000000, days: 30, daily_avg: 200000 },
      { month: 'October 2026', total: 2500000, days: 10, daily_avg: 250000 },
    ],
    velocity: {
      current_avg_daily: 250000,
      historical_avg_daily: 200000,
      days_with_spending: 8,
      days_tracked: 10,
      cumulative_spend: 2500000,
      projected_monthly: 7500000,
      velocity_vs_history: 25,
    },
    alerts: [
      {
        type: 'danger',
        message: 'Makan diproyeksikan overbudget',
      },
    ],
  },
};

describe('Forecast component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockForecastResponse,
    } as any);
  });

  it('renders top KPI cards and period info after data fetch', async () => {
    render(<Forecast />);

    await waitFor(() => {
      expect(screen.getByText('Realisasi Belanja')).toBeInTheDocument();
      expect(screen.getByText('Proyeksi Akhir Bulan')).toBeInTheDocument();
      expect(screen.getByText('Kuota Harian Aman')).toBeInTheDocument();
      expect(screen.getByText('Proyeksi Tabungan EOM')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });

  it('switches tabs and interacts with the safe daily allowance simulator', async () => {
    render(<Forecast />);

    await waitFor(() => {
      expect(screen.getByText('Simulator Kuota Harian')).toBeInTheDocument();
    });

    const allowanceTab = screen.getByText('Simulator Kuota Harian');
    fireEvent.click(allowanceTab);

    expect(screen.getByText(/Kalkulator Alokasi Belanja Harian Aman/i)).toBeInTheDocument();
  });

  it('switches to What-If course correction tab and clicks a preset button', async () => {
    render(<Forecast />);

    await waitFor(() => {
      expect(screen.getByText('Koreksi Arah (What-If)')).toBeInTheDocument();
    });

    const whatIfTab = screen.getByText('Koreksi Arah (What-If)');
    fireEvent.click(whatIfTab);

    expect(screen.getByText(/Simulasi Koreksi Arah Tengah Bulan/i)).toBeInTheDocument();

    const frugalBtn = screen.getByText('Frugal Rush (-30%)');
    fireEvent.click(frugalBtn);

    expect(screen.getByText('-30%')).toBeInTheDocument();
  });

  it('switches to category burn-rate tab', async () => {
    render(<Forecast />);

    await waitFor(() => {
      expect(screen.getByText('Burn-Rate & Kejenuhan Pagu')).toBeInTheDocument();
    });

    const burnTab = screen.getByText('Burn-Rate & Kejenuhan Pagu');
    fireEvent.click(burnTab);

    expect(screen.getByText(/Timeline Kejenuhan Kategori/i)).toBeInTheDocument();
    expect(screen.getByText('Akan Jebol')).toBeInTheDocument();
  });
});
