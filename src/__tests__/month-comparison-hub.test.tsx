/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { getMonthComparison } from '../lib/db';
import MonthComparison from '../components/MonthComparison';

// Mock chart.js and react-chartjs-2 to avoid canvas issues in jsdom
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart">Bar Chart</div>,
  Radar: () => <div data-testid="mock-radar-chart">Radar Chart</div>,
}));

vi.mock('../components/CategoryRadarChart', () => ({
  default: () => <div data-testid="mock-radar-component">Radar Component</div>,
}));

describe('getMonthComparison DB Function', () => {
  it('computes comparison metrics between default periods A and B', () => {
    const res = getMonthComparison();
    expect(res).toBeDefined();
    expect(res.availablePeriods).toBeDefined();
    expect(res.availablePeriods.length).toBeGreaterThan(0);

    expect(res.periodA).toBeDefined();
    expect(res.periodB).toBeDefined();
    expect(res.periodA.month).toBeDefined();
    expect(res.periodB.month).toBeDefined();

    // Financial KPI verification
    expect(typeof res.periodA.outcome.total).toBe('number');
    expect(typeof res.periodB.outcome.total).toBe('number');
    expect(typeof res.periodA.income).toBe('number');
    expect(typeof res.periodB.income).toBe('number');
    expect(typeof res.periodA.savings).toBe('number');
    expect(typeof res.periodB.savings).toBe('number');
    expect(typeof res.periodA.savings_rate_pct).toBe('number');
    expect(typeof res.periodB.savings_rate_pct).toBe('number');

    // Categories
    expect(Array.isArray(res.categories)).toBe(true);
    if (res.categories.length > 0) {
      const cat = res.categories[0];
      expect(cat.name).toBeDefined();
      expect(typeof cat.leftAmount).toBe('number');
      expect(typeof cat.rightAmount).toBe('number');
      expect(typeof cat.delta).toBe('number');
      expect(['up', 'down', 'same', 'new', 'zero']).toContain(cat.status);
    }

    // Top drivers
    expect(res.topDrivers).toBeDefined();
    expect(Array.isArray(res.topDrivers.topIncreases)).toBe(true);
    expect(Array.isArray(res.topDrivers.topSavings)).toBe(true);

    // Insights without em-dash (R-02)
    expect(Array.isArray(res.insights)).toBe(true);
    for (const insight of res.insights) {
      expect(insight).not.toContain('—');
    }
  });

  it('supports explicit period IDs and category drill-down', () => {
    const defaultRes = getMonthComparison();
    if (defaultRes.availablePeriods.length >= 2) {
      const pB = defaultRes.availablePeriods[0];
      const pA = defaultRes.availablePeriods[1];

      const res = getMonthComparison({
        periodAId: pA.id,
        periodBId: pB.id,
        drilldownCategory: defaultRes.categories[0]?.name || 'Tagihan',
      });

      expect(res.periodA.id).toBe(pA.id);
      expect(res.periodB.id).toBe(pB.id);
      expect(res.categoryTransactions).toBeDefined();
      if (res.categoryTransactions) {
        expect(Array.isArray(res.categoryTransactions.periodA)).toBe(true);
        expect(Array.isArray(res.categoryTransactions.periodB)).toBe(true);
      }
    }
  });
});

describe('MonthComparison UI Component', () => {
  const mockCompareResult = {
    availablePeriods: [
      { id: 45, month: 'November 2026', start_date: '2026-10-21', end_date: '2026-11-20', tx_count: 30 },
      { id: 44, month: 'October 2026', start_date: '2026-09-21', end_date: '2026-10-20', tx_count: 50 },
      { id: 38, month: 'September 2026', start_date: '2026-08-21', end_date: '2026-09-20', tx_count: 40 },
    ],
    periodA: {
      id: 44,
      month: 'October 2026',
      start_date: '2026-09-21',
      end_date: '2026-10-20',
      income: 25000000,
      outcome: {
        total: 15000000,
        cash: 5000000,
        credit_payment: 10000000,
        credit_expenses: 8000000,
      },
      invest_total: 2000000,
      savings: 12000000,
      savings_rate_pct: 48.0,
      networth_total: 150000000,
      tx_count: 50,
      avg_per_tx: 300000,
      top_transactions: [
        { id: 1, title: 'Laptop', amount: 5000000, category: 'Gadget', date: '2026-10-01', type: 'credit_payment' },
      ],
    },
    periodB: {
      id: 45,
      month: 'November 2026',
      start_date: '2026-10-21',
      end_date: '2026-11-20',
      income: 26000000,
      outcome: {
        total: 10000000,
        cash: 4000000,
        credit_payment: 6000000,
        credit_expenses: 5000000,
      },
      invest_total: 3000000,
      savings: 19000000,
      savings_rate_pct: 73.0,
      networth_total: 165000000,
      tx_count: 30,
      avg_per_tx: 333333,
      top_transactions: [
        { id: 2, title: 'Investasi Saham', amount: 3000000, category: 'Invest', date: '2026-10-25', type: 'cash' },
      ],
    },
    categories: [
      {
        name: 'Belanja',
        color: '#3b82f6',
        leftAmount: 4000000,
        rightAmount: 2000000,
        delta: -2000000,
        pctChange: -50.0,
        status: 'down',
        leftCount: 10,
        rightCount: 5,
      },
      {
        name: 'Makan',
        color: '#ef4444',
        leftAmount: 2000000,
        rightAmount: 3000000,
        delta: 1000000,
        pctChange: 50.0,
        status: 'up',
        leftCount: 15,
        rightCount: 20,
      },
      {
        name: 'Liburan',
        color: '#10b981',
        leftAmount: 0,
        rightAmount: 1500000,
        delta: 1500000,
        pctChange: 100.0,
        status: 'new',
        leftCount: 0,
        rightCount: 2,
      },
    ],
    topDrivers: {
      topIncreases: [
        {
          name: 'Makan',
          color: '#ef4444',
          leftAmount: 2000000,
          rightAmount: 3000000,
          delta: 1000000,
          pctChange: 50.0,
          status: 'up',
          leftCount: 15,
          rightCount: 20,
        },
      ],
      topSavings: [
        {
          name: 'Belanja',
          color: '#3b82f6',
          leftAmount: 4000000,
          rightAmount: 2000000,
          delta: -2000000,
          pctChange: -50.0,
          status: 'down',
          leftCount: 10,
          rightCount: 5,
        },
      ],
    },
    insights: [
      'Total pengeluaran November 2026 lebih hemat IDR 5.000.000 (-33.3%) dibandingkan October 2026.',
      'Efisiensi biaya terbaik dicapai pada kategori Belanja dengan penghematan IDR 2.000.000 (-50%).',
      'Tingkat tabungan berada pada 73% (surplus IDR 19.000.000), dibandingkan 48% pada October 2026.',
    ],
    categoryTransactions: {
      category: 'Belanja',
      periodA: [
        { id: 101, title: 'Baju Kerja', amount: 1500000, date: '2026-10-02', type: 'credit_payment' },
        { id: 102, title: 'Sepatu', amount: 2500000, date: '2026-10-10', type: 'credit_payment' },
      ],
      periodB: [
        { id: 201, title: 'Kaos', amount: 500000, date: '2026-10-28', type: 'cash' },
        { id: 202, title: 'Kemeja', amount: 1500000, date: '2026-11-05', type: 'credit_payment' },
      ],
    },
  };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockCompareResult),
        });
      })
    );
  });

  it('renders executive summary insights and 6 KPI comparison cards', async () => {
    render(<MonthComparison />);

    await waitFor(() => {
      expect(screen.getByText(/Ringkasan Eksekutif & Variansi/i)).toBeInTheDocument();
    });

    // Verify insights
    expect(screen.getByText(/Total pengeluaran November 2026 lebih hemat/i)).toBeInTheDocument();
    expect(screen.getByText(/Efisiensi biaya terbaik dicapai pada kategori Belanja/i)).toBeInTheDocument();

    // Verify KPI cards
    expect(screen.getByText('Total Pengeluaran')).toBeInTheDocument();
    expect(screen.getByText('Pemasukan Bulanan')).toBeInTheDocument();
    expect(screen.getByText('Tabungan Bersih')).toBeInTheDocument();
    expect(screen.getByText('Savings Rate')).toBeInTheDocument();
    expect(screen.getByText('Total Net Worth')).toBeInTheDocument();
    expect(screen.getByText('Rata-rata per Transaksi')).toBeInTheDocument();

    // Verify quick preset buttons
    expect(screen.getByText('Bulan Ini vs Lalu')).toBeInTheDocument();
    expect(screen.getByText('vs 2 Bulan Lalu')).toBeInTheDocument();
    expect(screen.getByText('Tahun Lalu (YoY)')).toBeInTheDocument();
  });

  it('filters category table by search query and tabs', async () => {
    render(<MonthComparison />);

    await waitFor(() => {
      expect(screen.getAllByText('Belanja').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Makan').length).toBeGreaterThan(0);
    });

    // Test search filter
    const searchInput = screen.getByPlaceholderText(/Cari nama kategori/i);
    fireEvent.change(searchInput, { target: { value: 'Makan' } });

    expect(screen.getAllByText('Makan').length).toBeGreaterThan(0);
    // In table, Belanja should not be present (only in top savings card)
    const tableCells = screen.queryAllByRole('cell', { name: 'Belanja' });
    expect(tableCells.length).toBe(0);

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getAllByRole('cell', { name: 'Belanja' }).length).toBeGreaterThan(0);

    // Test status tabs
    const borosTab = screen.getByRole('button', { name: /Kenaikan \/ Boros/i });
    fireEvent.click(borosTab);
    expect(screen.getAllByText('Makan').length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('cell', { name: 'Belanja' }).length).toBe(0);
  });

  it('opens transaction drill-down modal on clicking a category row', async () => {
    render(<MonthComparison />);

    await waitFor(() => {
      expect(screen.getAllByText('Belanja').length).toBeGreaterThan(0);
    });

    const categoryCell = screen.getAllByRole('cell', { name: 'Belanja' })[0];
    fireEvent.click(categoryCell);

    await waitFor(() => {
      expect(screen.getByText(/Rincian Transaksi: Belanja/i)).toBeInTheDocument();
      expect(screen.getByText('Baju Kerja')).toBeInTheDocument();
      expect(screen.getByText('Kaos')).toBeInTheDocument();
    });
  });

  it('satisfies antislop copy rule R-02 with no em-dashes anywhere in text', async () => {
    const { container } = render(<MonthComparison />);

    await waitFor(() => {
      expect(screen.getByText(/Ringkasan Eksekutif/i)).toBeInTheDocument();
    });

    expect(container.textContent).not.toContain('—');
  });
});
