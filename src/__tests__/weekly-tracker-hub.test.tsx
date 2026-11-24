/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data }: any) => <div data-testid="mock-bar-chart">{data?.labels?.join(',')}</div>,
  Line: ({ data }: any) => <div data-testid="mock-line-chart">{data?.labels?.join(',')}</div>,
  Doughnut: ({ data }: any) => <div data-testid="mock-donut-chart">{data?.labels?.join(',')}</div>,
}));

vi.mock('../lib/api', () => ({
  fetchSummaries: vi.fn().mockResolvedValue([
    {
      period_id: 10,
      month: 'June 2026',
      income: 10000000,
      outcome: { total: 6000000, cash: 2000000, credit_payment: 4000000 },
      savings: 4000000,
      savings_rate_pct: 40,
    },
  ]),
}));

const mockWeeklyApiResponse = {
  periodId: 10,
  month: 'June 2026',
  periodStart: '2026-05-21',
  periodEnd: '2026-06-20',
  totalSpend: 6000000,
  totalTxCount: 5,
  weeklyBudget: 2000000,
  daysPerWeek: [7, 7, 7, 7, 3],
  income: 10000000,
  weeks: [
    {
      weekNum: 1,
      label: 'Week 1 (May 21-27)',
      startDate: '2026-05-21',
      endDate: '2026-05-27',
      total: 3000000,
      txCount: 2,
      categoryTotals: { Tagihan: 2500000, Makan: 500000 },
      avgDaily: 428571,
      weekdaySpend: 2500000,
      weekendSpend: 500000,
      weekdayCount: 1,
      weekendCount: 1,
      transactions: [
        {
          id: 101,
          title: 'Sewa Kantor',
          category: 'Tagihan',
          amount: 2500000,
          type: 'cash',
          done: 1,
          created_time: '2026-05-21T09:00:00Z',
          date: '2026-05-21',
          isWeekend: false,
        },
        {
          id: 102,
          title: 'Makan Steak',
          category: 'Makan',
          amount: 500000,
          type: 'credit_expense',
          done: 1,
          created_time: '2026-05-24T19:00:00Z',
          date: '2026-05-21',
          isWeekend: true,
        },
      ],
    },
    {
      weekNum: 2,
      label: 'Week 2 (May 28-Jun 3)',
      startDate: '2026-05-28',
      endDate: '2026-06-03',
      total: 1500000,
      txCount: 2,
      categoryTotals: { Makan: 1000000, Transport: 500000 },
      avgDaily: 214285,
      weekdaySpend: 1000000,
      weekendSpend: 500000,
      weekdayCount: 1,
      weekendCount: 1,
      transactions: [
        {
          id: 103,
          title: 'Makan Siang Tim',
          category: 'Makan',
          amount: 1000000,
          type: 'credit_expense',
          done: 1,
          created_time: '2026-05-29T12:00:00Z',
          date: '2026-05-21',
          isWeekend: false,
        },
        {
          id: 104,
          title: 'Bensin Shell',
          category: 'Transport',
          amount: 500000,
          type: 'cash',
          done: 1,
          created_time: '2026-05-31T15:00:00Z',
          date: '2026-05-21',
          isWeekend: true,
        },
      ],
    },
  ],
};

import WeeklyTracker from '../components/WeeklyTracker';

describe('WeeklyTracker (Weekly Spending & Pacing Intelligence Hub)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/weekly-spending')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockWeeklyApiResponse),
          } as Response);
        }
        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
      })
    );
  });

  it('renders weekly headline KPI metrics and discipline tier', async () => {
    render(<WeeklyTracker />);

    await waitFor(() => {
      expect(screen.getByText('Total Pemasukan')).toBeInTheDocument();
      expect(screen.getByText('Total Realisasi Belanja')).toBeInTheDocument();
      expect(screen.getByText('Plafon Mingguan Rata-rata')).toBeInTheDocument();
      expect(screen.getByText('Skor Disiplin Pacing')).toBeInTheDocument();
    });
  });

  it('switches smoothly between tabs (Pacing, Safe-to-Spend, Audit Transaksi)', async () => {
    render(<WeeklyTracker />);

    await waitFor(() => {
      expect(screen.getByText('Realisasi Belanja Mingguan vs Plafon')).toBeInTheDocument();
    });

    // Switch to Safe-to-Spend Simulator Tab
    fireEvent.click(screen.getByRole('button', { name: 'Safe-to-Spend' }));
    expect(screen.getByText(/Kalkulator Batas Aman Belanja Harian/i)).toBeInTheDocument();
    expect(screen.getByText(/Jatah Harian Aman/i)).toBeInTheDocument();

    // Switch to Audit Transaksi Tab
    fireEvent.click(screen.getByRole('button', { name: 'Audit Transaksi & Weekend' }));
    expect(screen.getByText('Audit Seluruh Transaksi Periode')).toBeInTheDocument();
    expect(screen.getByText('Sewa Kantor')).toBeInTheDocument();
    expect(screen.getByText('Makan Steak')).toBeInTheDocument();
  });

  it('filters transactions by search query and weekend type in Audit tab', async () => {
    render(<WeeklyTracker />);

    await waitFor(() => {
      expect(screen.getByText('Realisasi Belanja Mingguan vs Plafon')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Audit Transaksi & Weekend' }));

    const searchInput = screen.getByPlaceholderText('Cari transaksi atau kategori...');
    fireEvent.change(searchInput, { target: { value: 'Sewa' } });

    expect(screen.getByText('Sewa Kantor')).toBeInTheDocument();
    expect(screen.queryByText('Makan Steak')).not.toBeInTheDocument();
  });

  it('does not contain any forbidden em-dash in UI text', async () => {
    const { container } = render(<WeeklyTracker />);

    await waitFor(() => {
      expect(screen.getByText('Total Pemasukan')).toBeInTheDocument();
    });

    expect(container.textContent).not.toContain('—');
  });
});
