/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  simulateScenario,
  applyScenarioPreset,
  computeMilestoneImpacts,
  computeGoalImpacts,
  type ScenarioData,
} from '../lib/what-if-engine';

vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: any) => (
    <div
      data-testid="mock-line-chart"
      data-datasets={data?.datasets?.length ?? 0}
      data-points={data?.datasets?.[0]?.data?.length ?? 0}
    />
  ),
  Bar: ({ data }: any) => (
    <div
      data-testid="mock-bar-chart"
      data-datasets={data?.datasets?.length ?? 0}
    />
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockConfirm = vi.fn().mockResolvedValue(true);
vi.mock('@/components/ConfirmDialog', () => ({
  useConfirm: () => ({ confirm: mockConfirm }),
}));

import WhatIfPlanner from '../components/WhatIfPlanner';

const sampleData: ScenarioData = {
  periods: [
    {
      period_id: 1,
      month: 'September 2026',
      income: 20_000_000,
      outcome: 12_000_000,
      invest: 3_000_000,
      category_totals: { Food: 4_000_000, Transport: 2_000_000, Invest: 3_000_000 },
      networth: 180_000_000,
    },
    {
      period_id: 2,
      month: 'October 2026',
      income: 20_000_000,
      outcome: 12_000_000,
      invest: 3_000_000,
      category_totals: { Food: 4_000_000, Transport: 2_000_000, Invest: 3_000_000 },
      networth: 190_000_000,
    },
  ],
  categories: [
    { name: 'Food', color: '#ef4444', monthly_limit: 5_000_000, avg_spending: 4_000_000 },
    { name: 'Transport', color: '#3b82f6', monthly_limit: 2_500_000, avg_spending: 2_000_000 },
    { name: 'Invest', color: '#10b981', monthly_limit: 0, avg_spending: 3_000_000 },
  ],
  goals: [
    {
      id: 1,
      name: 'Dana Darurat',
      target_amount: 100_000_000,
      current_amount: 60_000_000,
      target_date: '2027-06-01',
      color: '#10b981',
    },
  ],
  avgIncome: 20_000_000,
  avgSpending: 12_000_000,
  avgInvest: 3_000_000,
  avgSavings: 8_000_000,
  currentNetworth: 190_000_000,
  avgNwGrowth: 10_000_000,
  savingsRate: 40,
};

describe('what-if-engine', () => {
  it('simulates compound return and category cuts accurately without em-dash', () => {
    const proj = simulateScenario(sampleData, {
      incomeChangePct: 10,
      annualReturnPct: 12,
      categoryAdjustments: {
        Food: { name: 'Food', pct: -25, delta: -1_000_000 },
      },
      oneTimeEvents: [{ id: 'e1', label: 'Bonus', amount: 5_000_000, monthOffset: 0 }],
      projectionMonths: 12,
    });

    expect(proj.adjustedIncome).toBe(22_000_000);
    expect(proj.adjustedSpending).toBe(11_000_000);
    expect(proj.monthlyNet).toBe(11_000_000);
    expect(proj.compoundGain).toBeGreaterThan(0);
    expect(proj.finalScenario).toBeGreaterThan(proj.finalBaseline);
    expect(proj.insights.every((i) => !i.title.includes('—') && !i.detail.includes('—'))).toBe(true);
  });

  it('frugal_sprint preset excludes Invest category', () => {
    const inputs = applyScenarioPreset('frugal_sprint', sampleData.categories, 24);
    expect(inputs.categoryAdjustments['Invest']).toBeUndefined();
    expect(inputs.categoryAdjustments['Food']?.pct).toBe(-20);
    expect(inputs.categoryAdjustments['Transport']?.pct).toBe(-20);
  });

  it('computes milestone and goal acceleration impacts', () => {
    const milestones = computeMilestoneImpacts(190_000_000, 10_000_000, 15_000_000, 10, []);
    expect(milestones.length).toBeGreaterThan(0);
    expect(milestones[0].target).toBe(200_000_000);
    expect(milestones[0].scenarioMonths).toBe(1);

    const goals = computeGoalImpacts(sampleData.goals || [], 8_000_000, 16_000_000);
    expect(goals).toHaveLength(1);
    expect(goals[0].monthsSaved).toBeGreaterThan(0);
  });
});

describe('WhatIfPlanner UI', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/what-if');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders loading skeleton then KPIs, presets, and charts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sampleData,
      })
    );

    render(<WhatIfPlanner />);
    expect(screen.getByTestId('whatif-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Trajektori Kekayaan Bersih (24 Bulan)')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-line-chart')).toHaveAttribute('data-datasets', '2');
    expect(screen.getByText('Frugal Sprint -20%')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Frugal Sprint -20%'));
    expect(screen.getByText('Simulasi Aktif')).toBeInTheDocument();
  });

  it('renders error state with retry button on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));

    render(<WhatIfPlanner />);
    await waitFor(() => {
      expect(screen.getByText('Gagal memuat data skenario')).toBeInTheDocument();
    });
    expect(screen.getByText('Coba Lagi')).toBeInTheDocument();
  });

  it('saves, pins to chart, and clears scenarios with confirmation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sampleData,
      })
    );

    render(<WhatIfPlanner />);
    await waitFor(() => {
      expect(screen.getByText('Trajektori Kekayaan Bersih (24 Bulan)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Simpan & Bandingkan/i }));
    const nameInput = screen.getByLabelText('Nama snapshot skenario');
    fireEvent.change(nameInput, { target: { value: 'Target Agresif' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Skenario/i }));

    expect(screen.getByText('Target Agresif')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pin Pembanding' }));

    fireEvent.click(screen.getByRole('tab', { name: /Proyeksi & Milestone/i }));
    expect(screen.getByTestId('mock-line-chart')).toHaveAttribute('data-datasets', '3');

    fireEvent.click(screen.getByRole('tab', { name: /Simpan & Bandingkan/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Semua' }));
    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(localStorage.getItem('findash_whatif_scenarios_v1')).toBeNull();
    });
  });
});
