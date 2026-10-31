/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock chart.js / react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="mock-line-chart">
      <span data-testid="chart-datasets-count">{data?.datasets?.length || 0}</span>
    </div>
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="mock-bar-chart">
      <span data-testid="chart-datasets-count">{data?.datasets?.length || 0}</span>
    </div>
  ),
}));

vi.mock('../lib/chartConfig', () => ({
  fpGrid: () => 'rgba(255, 255, 255, 0.1)',
}));

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`,
  };
});

const mockFireApiResponse = {
  monthlyExpenses: 8000000,
  annualExpenses: 96000000,
  monthlyIncome: 15000000,
  monthlySavings: 7000000,
  currentNetworth: 300000000,
  savingsRate: 46.7,
  fireNumber: 2400000000,
  progressPct: 12.5,
  yearsToFi: 12.3,
  projectedFiDate: 'Oktober 2038',
  monthlyContributionNeeded: 0,
  projection: [
    { year: 0, date: 'Now', balance: 300000000, contributions: 0, returns: 0 },
    { year: 1, date: 'Oct 2027', balance: 410000000, contributions: 84000000, returns: 26000000 },
    { year: 2, date: 'Oct 2028', balance: 535000000, contributions: 168000000, returns: 67000000 },
  ],
  params: {
    withdrawalRate: 0.04,
    expectedReturn: 0.08,
    inflation: 0.035,
  },
};

import FireCalculator from '../components/FireCalculator';

describe('FireCalculator (FIRE Intelligence Hub)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockFireApiResponse,
    } as Response);
  });

  it('renders loading skeleton initially', () => {
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    render(<FireCalculator />);
    expect(screen.getByTestId('fire-loading-state')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Koneksi database terputus' }),
    } as Response);

    render(<FireCalculator />);
    await waitFor(() => {
      expect(screen.getByTestId('fire-error-state')).toBeInTheDocument();
      expect(screen.getByText('Koneksi database terputus')).toBeInTheDocument();
    });
  });

  it('renders the complete FIRE intelligence hub on success', async () => {
    render(<FireCalculator />);

    await waitFor(() => {
      expect(screen.getByTestId('fire-intelligence-hub')).toBeInTheDocument();
      expect(screen.getByTestId('fire-tier-selector')).toBeInTheDocument();
      expect(screen.getByTestId('fire-kpi-grid')).toBeInTheDocument();
      expect(screen.getByTestId('fire-milestones-pathway')).toBeInTheDocument();
      expect(screen.getByTestId('fire-assumptions-panel')).toBeInTheDocument();
      expect(screen.getByTestId('fire-chart-card')).toBeInTheDocument();
      expect(screen.getByTestId('fire-schedule-card')).toBeInTheDocument();
      expect(screen.getByTestId('fire-insights-panel')).toBeInTheDocument();
    });
  });

  it('switches FIRE tiers and updates active target calculation', async () => {
    render(<FireCalculator />);

    await waitFor(() => {
      expect(screen.getByTestId('fire-tier-selector')).toBeInTheDocument();
    });

    // Default is Standard FIRE (100% expenses = 96M / 0.04 = 2.4 Miliar)
    const targetKpi = screen.getByTestId('kpi-fire-target');
    expect(targetKpi).toHaveTextContent('Target Standard FIRE');
    expect(targetKpi).toHaveTextContent('Rp 2.400.000.000');

    // Switch to Lean FIRE (75% expenses = 72M / 0.04 = 1.8 Miliar)
    const leanCard = screen.getByTestId('fire-tier-card-lean');
    fireEvent.click(leanCard);

    expect(screen.getByTestId('kpi-fire-target')).toHaveTextContent('Target Lean FIRE');
    expect(screen.getByTestId('kpi-fire-target')).toHaveTextContent('Rp 1.800.000.000');

    // Switch to Chubby FIRE (130% expenses = 124.8M / 0.04 = 3.12 Miliar)
    const chubbyCard = screen.getByTestId('fire-tier-card-chubby');
    fireEvent.click(chubbyCard);

    expect(screen.getByTestId('kpi-fire-target')).toHaveTextContent('Target Chubby FIRE');
    expect(screen.getByTestId('kpi-fire-target')).toHaveTextContent('Rp 3.120.000.000');
  });

  it('responds to simulation sliders (SWR, expenses, extra savings)', async () => {
    render(<FireCalculator />);

    await waitFor(() => {
      expect(screen.getByTestId('slider-wr')).toBeInTheDocument();
    });

    // Change SWR to 5% (Target = 96M / 0.05 = 1.92 Miliar for Standard)
    const swrSlider = screen.getByTestId('slider-wr');
    fireEvent.change(swrSlider, { target: { value: '5.0' } });

    await waitFor(() => {
      expect(screen.getByTestId('kpi-fire-target')).toHaveTextContent('Rp 1.920.000.000');
    });

    // Adjust expense slider to -10%
    const expenseSlider = screen.getByTestId('slider-expense-adjust');
    fireEvent.change(expenseSlider, { target: { value: '-10' } });

    // Target drops further because annual expense is reduced
    await waitFor(() => {
      // 8M * 0.9 = 7.2M/mo => 86.4M/yr / 0.05 = 1.728 Miliar
      expect(screen.getByTestId('kpi-fire-target')).toHaveTextContent('Rp 1.728.000.000');
    });

    // Reset button restores defaults
    const resetBtn = screen.getByTestId('reset-assumptions-btn');
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByTestId('kpi-fire-target')).toHaveTextContent('Rp 2.400.000.000');
    });
  });

  it('toggles schedule table view from 5 years to all years', async () => {
    render(<FireCalculator />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-schedule-view-btn')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByTestId('toggle-schedule-view-btn');
    expect(toggleBtn).toHaveTextContent('Tampilkan Semua Tahun');

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent('Ringkas 5 Tahun Pertama');
  });

  it('calculates Coast FIRE readiness correctly', async () => {
    render(<FireCalculator />);

    await waitFor(() => {
      expect(screen.getByTestId('kpi-coast-fire')).toBeInTheDocument();
    });

    // Coast FIRE target is calculated based on current age & target age
    const coastKpi = screen.getByTestId('kpi-coast-fire');
    expect(coastKpi).toHaveTextContent('Target Coast FIRE');
    expect(coastKpi).toHaveTextContent('Status:');
  });

  it('displays 4 milestone stages with progress', async () => {
    render(<FireCalculator />);

    await waitFor(() => {
      expect(screen.getByTestId('milestone-card-quarter')).toBeInTheDocument();
      expect(screen.getByTestId('milestone-card-halfway')).toBeInTheDocument();
      expect(screen.getByTestId('milestone-card-three_quarter')).toBeInTheDocument();
      expect(screen.getByTestId('milestone-card-full')).toBeInTheDocument();
    });
  });
});
