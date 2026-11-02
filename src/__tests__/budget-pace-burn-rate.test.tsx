/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { getBudgetPace } from '../lib/db';
import BudgetPace from '../components/BudgetPace';

// Mock utils
vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`,
  };
});

describe('getBudgetPace DB Function', () => {
  it('computes budget pace with burn-rate and daily timeline metrics', () => {
    const pace = getBudgetPace();
    expect(pace).toBeDefined();
    expect(pace.period_id).toBeGreaterThan(0);
    expect(pace.days_total).toBeGreaterThan(0);
    expect(pace.days_elapsed).toBeGreaterThanOrEqual(0);
    expect(pace.days_elapsed).toBeLessThanOrEqual(pace.days_total);
    expect(pace.days_remaining).toBe(pace.days_total - pace.days_elapsed);

    // Timeline validation
    expect(pace.daily_timeline).toBeDefined();
    expect(pace.daily_timeline.length).toBe(pace.days_total);
    expect(pace.daily_timeline[0].day).toBe(1);
    expect(pace.daily_timeline[pace.daily_timeline.length - 1].day).toBe(pace.days_total);

    // Safe and actual burn rates
    expect(pace.safe_daily_burn).toBeGreaterThanOrEqual(0);
    expect(pace.actual_daily_burn).toBeGreaterThanOrEqual(0);
    expect(pace.budget_burn_rate_ratio).toBeGreaterThan(0);

    // Available periods
    expect(pace.available_periods).toBeDefined();
    expect(pace.available_periods.length).toBeGreaterThan(0);

    // Categories
    expect(pace.categories).toBeDefined();
    if (pace.categories.length > 0) {
      const cat = pace.categories[0];
      expect(cat.category).toBeDefined();
      expect(cat.limit).toBeGreaterThan(0);
      expect(cat.safe_daily_burn).toBeGreaterThanOrEqual(0);
      expect(cat.actual_daily_burn).toBeGreaterThanOrEqual(0);
      expect(cat.tx_count).toBeGreaterThanOrEqual(0);
      expect(cat.transactions).toBeDefined();
    }
  });

  it('handles past period resolution when periodId is provided', () => {
    const activePace = getBudgetPace();
    if (activePace.available_periods.length > 1) {
      const pastPeriod = activePace.available_periods[1];
      const pastPace = getBudgetPace(pastPeriod.id);
      expect(pastPace.period_id).toBe(pastPeriod.id);
      expect(pastPace.period_label).toBe(pastPeriod.month);
      expect(pastPace.days_elapsed).toBe(pastPace.days_total);
      expect(pastPace.days_remaining).toBe(0);
    }
  });
});

describe('BudgetPace UI Component', () => {
  const mockPaceResult = {
    period_id: 45,
    period_label: 'November 2026',
    start_date: '2026-10-21',
    end_date: '2026-11-20',
    days_elapsed: 13,
    days_total: 31,
    days_remaining: 18,
    time_elapsed_pct: 41.9,
    total_budget: 15000000,
    total_spent: 7000000,
    remaining_budget: 8000000,
    total_expected: 6285000,
    total_pace_diff: 715000,
    total_pace_pct: 11.3,
    total_projected: 16692307,
    safe_daily_burn: 444444,
    actual_daily_burn: 538461,
    budget_burn_rate_ratio: 1.11,
    run_out_day: 28,
    run_out_date: '2026-11-17',
    overall_status: 'warning' as const,
    available_periods: [
      { id: 45, month: 'November 2026', start_date: '2026-10-21', end_date: '2026-11-20', is_active: true },
      { id: 44, month: 'October 2026', start_date: '2026-09-21', end_date: '2026-10-20', is_active: false },
    ],
    daily_timeline: [
      { day: 1, date: '2026-10-21', spent_daily: 200000, spent_cumulative: 200000, expected_cumulative: 483870, budget_limit: 15000000 },
      { day: 13, date: '2026-11-02', spent_daily: 150000, spent_cumulative: 7000000, expected_cumulative: 6285000, budget_limit: 15000000 },
      { day: 31, date: '2026-11-20', spent_daily: 0, spent_cumulative: 7000000, expected_cumulative: 15000000, budget_limit: 15000000, projected_cumulative: 16692307 },
    ],
    categories: [
      {
        category: 'Makanan',
        color: '#f59e0b',
        limit: 4000000,
        spent: 2500000,
        spent_pct: 62.5,
        expected_pct: 41.9,
        pace_diff: 20.6,
        pace_status: 'over_pace' as const,
        projected_total: 5961538,
        projected_diff: 1961538,
        days_elapsed: 13,
        days_total: 31,
        days_remaining: 18,
        remaining_budget: 1500000,
        safe_daily_burn: 83333,
        actual_daily_burn: 192307,
        tx_count: 2,
        transactions: [
          { id: 101, title: 'Makan Siang Resto', amount: 1500000, date: '2026-10-25', payment_method: 'Credit', type: 'credit_expense' },
          { id: 102, title: 'Groceries Supermarket', amount: 1000000, date: '2026-10-29', payment_method: 'Cash', type: 'cash' },
        ],
      },
      {
        category: 'Transport',
        color: '#3b82f6',
        limit: 2000000,
        spent: 600000,
        spent_pct: 30.0,
        expected_pct: 41.9,
        pace_diff: -11.9,
        pace_status: 'on_track' as const,
        projected_total: 1430769,
        projected_diff: -569231,
        days_elapsed: 13,
        days_total: 31,
        days_remaining: 18,
        remaining_budget: 1400000,
        safe_daily_burn: 77777,
        actual_daily_burn: 46153,
        tx_count: 1,
        transactions: [
          { id: 201, title: 'Bensin Kendaraan', amount: 600000, date: '2026-10-26', payment_method: 'Cash', type: 'cash' },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPaceResult),
      });
    });
  });

  it('renders pace intelligence dashboard with KPI metrics and trajectory chart', async () => {
    render(<BudgetPace />);

    // Wait for content load
    await waitFor(() => {
      expect(screen.getByText('Budget Pace & Burn-Rate Intelligence')).toBeInTheDocument();
    });

    // Check KPI cards
    expect(screen.getByText(/Hari ke-13/)).toBeInTheDocument();
    expect(screen.getAllByText(/18 hari tersisa/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Kecepatan Aktual/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Proyeksi Akhir Periode/)).toBeInTheDocument();

    // Check categories
    expect(screen.getByText('Makanan')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('filters category cards by search query and status pills', async () => {
    render(<BudgetPace />);

    await waitFor(() => {
      expect(screen.getByText('Makanan')).toBeInTheDocument();
      expect(screen.getByText('Transport')).toBeInTheDocument();
    });

    // Search query filter
    const searchInput = screen.getByPlaceholderText('Cari kategori...');
    fireEvent.change(searchInput, { target: { value: 'Makan' } });

    expect(screen.getByText('Makanan')).toBeInTheDocument();
    expect(screen.queryByText('Transport')).not.toBeInTheDocument();

    // Reset search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Transport')).toBeInTheDocument();

    // Status pill filter: click 'On Track'
    const onTrackButton = screen.getByRole('button', { name: 'On Track' });
    fireEvent.click(onTrackButton);

    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.queryByText('Makanan')).not.toBeInTheDocument();
  });

  it('opens category drill-down dialog with transaction details on card click', async () => {
    render(<BudgetPace />);

    await waitFor(() => {
      expect(screen.getByText('Makanan')).toBeInTheDocument();
    });

    // Click on Makanan category card
    const makananCard = screen.getByText('Makanan').closest('[role="button"]')!;
    fireEvent.click(makananCard);

    // Modal should show up
    await waitFor(() => {
      expect(screen.getByText('Daftar Transaksi Terkait (2)')).toBeInTheDocument();
      expect(screen.getByText('Makan Siang Resto')).toBeInTheDocument();
      expect(screen.getByText('Groceries Supermarket')).toBeInTheDocument();
      expect(screen.getByText('Rekomendasi Tindakan')).toBeInTheDocument();
    });
  });

  it('updates What-If simulation projections on slider adjustment', async () => {
    render(<BudgetPace />);

    await waitFor(() => {
      expect(screen.getByText('Simulator Penyesuaian Belanja Harian (What-If)')).toBeInTheDocument();
    });

    const slider = screen.getByLabelText('Simulasi Pengeluaran Harian');
    fireEvent.change(slider, { target: { value: '100000' } });

    // With 100,000 / day * 18 days = 1,800,000 + 7,000,000 = 8,800,000 (Savings: 6,200,000)
    await waitFor(() => {
      expect(screen.getByText(/Pacing sangat sehat dan memberi ruang tabungan ekstra/)).toBeInTheDocument();
    });
  });
});
