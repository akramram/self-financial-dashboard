/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('../components/Sparkline', () => ({
  default: ({ data, color }: any) => (
    <div data-testid="sparkline" data-color={color}>
      {data?.length || 0} points
    </div>
  ),
}));

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`,
  };
});

const mockRunwayData = {
  liquid_assets: 45000000,
  total_assets: 90000000,
  illiquid_assets: 45000000,
  monthly_expense: 7500000,
  monthly_fixed: 4000000,
  runway_months: 6.0,
  fixed_coverage_months: 11.25,
  status: 'strong' as const,
  target_months: 6,
  asset_breakdown: [
    { name: 'Bank BCA', value: 25000000, liquidityPct: 1.0, liquidValue: 25000000 },
    { name: 'RDPU Bibit', value: 20000000, liquidityPct: 0.9, liquidValue: 18000000 },
    { name: 'Saham IDX', value: 45000000, liquidityPct: 0.5, liquidValue: 22500000 },
  ],
  history: [
    { period_id: 1, month: 'May 2026', liquid_assets: 30000000, total_assets: 60000000, runway_months: 4.5 },
    { period_id: 2, month: 'June 2026', liquid_assets: 38000000, total_assets: 75000000, runway_months: 5.2 },
    { period_id: 3, month: 'July 2026', liquid_assets: 45000000, total_assets: 90000000, runway_months: 6.0 },
  ],
  period_id: 3,
  month: 'July 2026',
  tips: [
    'Runway 6.0 bulan sudah sangat sehat.',
    'Pengeluaran tetap bulanan tertutup aman.',
  ],
};

import RunwayAnalysis from '../components/RunwayAnalysis';

describe('RunwayAnalysis Hub Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders runway overview with gauge and key stats after fetch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRunwayData,
    }) as any;

    render(<RunwayAnalysis />);

    await waitFor(() => {
      expect(screen.getByText('Emergency Fund Runway')).toBeInTheDocument();
    });

    expect(screen.getByText('Sangat Tangguh')).toBeInTheDocument();
    expect(screen.getByText('Berdasarkan data periode July 2026')).toBeInTheDocument();
    expect(screen.getByText('Aset Likuid Tersedia')).toBeInTheDocument();
    expect(screen.getByText('Cakupan Biaya Pokok')).toBeInTheDocument();
    expect(screen.getByText('11.3 bulan')).toBeInTheDocument();
  });

  it('navigates across tabs: Stress Test, Tangga Target, and Likuiditas', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRunwayData,
    }) as any;

    render(<RunwayAnalysis />);

    await waitFor(() => {
      expect(screen.getByText('Emergency Fund Runway')).toBeInTheDocument();
    });

    // Default tab is Stress Test
    expect(screen.getByText('Simulator & Stress Test Ketahanan Finansial')).toBeInTheDocument();

    // Switch to Tangga Target tab
    const targetTabBtn = screen.getByRole('button', { name: 'Tangga Target' });
    fireEvent.click(targetTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Tangga Target Dana Darurat (Emergency Fund Tiers)')).toBeInTheDocument();
    });
    expect(screen.getByText('Survival Buffer')).toBeInTheDocument();
    expect(screen.getByText('Standar Keamanan')).toBeInTheDocument();
    expect(screen.getByText('Benteng Finansial')).toBeInTheDocument();

    // Switch to Likuiditas tab
    const ladderTabBtn = screen.getByRole('button', { name: 'Likuiditas' });
    fireEvent.click(ladderTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Tangga Likuiditas Aset (Liquidity Ladder)')).toBeInTheDocument();
    });
    expect(screen.getByText('Tier 1: Likuid Instan (T+0)')).toBeInTheDocument();
  });

  it('interacts with Stress Test simulator presets', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRunwayData,
    }) as any;

    render(<RunwayAnalysis />);

    await waitFor(() => {
      expect(screen.getByText('Simulator & Stress Test Ketahanan Finansial')).toBeInTheDocument();
    });

    // Click 'Mode Hemat Pokok' preset button
    const leanBtn = screen.getByText('Mode Hemat Pokok');
    fireEvent.click(leanBtn);

    await waitFor(() => {
      // Both the button and the active scenario summary will reflect Mode Hemat Pokok
      expect(screen.getAllByText('Mode Hemat Pokok').length).toBeGreaterThanOrEqual(1);
    });

    // Click 'Syok Darurat' preset button
    const shockBtn = screen.getByText('Syok Darurat');
    fireEvent.click(shockBtn);

    await waitFor(() => {
      expect(screen.getByText('Syok Medis / Darurat')).toBeInTheDocument();
    });
  });

  it('renders empty state when total_assets is 0', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockRunwayData,
        total_assets: 0,
        liquid_assets: 0,
        asset_breakdown: [],
      }),
    }) as any;

    render(<RunwayAnalysis />);

    await waitFor(() => {
      expect(screen.getByText(/Runway membutuhkan data aset networth/i)).toBeInTheDocument();
    });
  });
});
