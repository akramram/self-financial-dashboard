/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import RewindHub from '../components/RewindHub';
import type { RewindReport } from '../lib/rewind-analytics';

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`,
  };
});

const REPORT: RewindReport = {
  year: 2026,
  monthsActive: 2,
  totalIncome: 21_000_000,
  totalOutcome: 7_000_000,
  avgMonthlyOutcome: 3_500_000,
  savingsRatePct: 66.7,
  investTotal: 2_000_000,
  investSharePct: 28.6,
  monthly: [
    { period_id: 2, month: 'Jan', income: 10_000_000, outcome: 6_000_000 },
    { period_id: 3, month: 'Feb', income: 11_000_000, outcome: 1_000_000 },
  ],
  heaviest: { period_id: 2, month: 'Jan', income: 10_000_000, outcome: 6_000_000 },
  lightest: { period_id: 3, month: 'Feb', income: 11_000_000, outcome: 1_000_000 },
  topCategories: [{ name: 'Belanja', total: 4_000_000, pct: 57.1 }],
  biggestTx: { title: 'Beli Laptop', category: 'Elektronik', amount: 4_000_000, month: 'Jan' },
  txCount: 3,
  networthStart: 100_000_000,
  networthEnd: 110_000_000,
  networthGrowthPct: 10,
  personality: { label: 'Arsitek Kekayaan', blurb: 'Pemasukan dikerjakan lewat investasi.' },
};

function setupFetch(ok = true, report: RewindReport | null = REPORT) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => ({ years: [2026, 2025], report }) })
    )
  );
}

describe('RewindHub Component', () => {
  beforeEach(() => {
    setupFetch();
  });

  it('renders loading then KPI grid and personality', async () => {
    render(<RewindHub />);
    expect(screen.getByTestId('rewind-loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('rewind-hub')).toBeInTheDocument());
    expect(screen.getByText('Rewind 2026')).toBeInTheDocument();
    expect(screen.getByText('Arsitek Kekayaan')).toBeInTheDocument();
    expect(screen.getByText('Total Pemasukan')).toBeInTheDocument();
    expect(screen.getByText('Savings Rate')).toBeInTheDocument();
    expect(screen.getByText('5 Kategori Terbesar')).toBeInTheDocument();
    expect(screen.getByText('Beli Laptop')).toBeInTheDocument();
    expect(screen.getByText('+10.0% dari awal tahun')).toBeInTheDocument();
  });

  it('shows empty state when report is null', async () => {
    setupFetch(true, null);
    render(<RewindHub />);
    await waitFor(() => expect(screen.getByTestId('rewind-empty')).toBeInTheDocument());
    expect(screen.getByText(/Belum ada data periode/)).toBeInTheDocument();
  });

  it('shows error state with retry when fetch fails', async () => {
    setupFetch(false);
    render(<RewindHub />);
    await waitFor(() => expect(screen.getByTestId('rewind-error')).toBeInTheDocument());
    expect(screen.getByText(/Gagal memuat data rewind/)).toBeInTheDocument();
    setupFetch(true);
    screen.getByRole('button', { name: 'Coba lagi' }).click();
    await waitFor(() => expect(screen.getByTestId('rewind-hub')).toBeInTheDocument());
  });
});
