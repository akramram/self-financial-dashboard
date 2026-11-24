/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`,
    formatNumber: (n: number) => String(n),
  };
});

vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="doughnut-chart" />,
}));

import RecurringCostAnalyzer from '../components/RecurringCostAnalyzer';
import type { RecurringCostResult } from '../lib/db';

const mockAnalysisResult = {
  items: [
    {
      id: 1,
      title: 'Netflix',
      cleanTitle: 'Netflix',
      category: 'Entertainment',
      amount: 186000,
      type: 'credit_expense',
      active: true,
      end_date: null,
      created_at: '1',
      isTemporary: false,
      isInstallment: false,
      totalTenor: null,
      currentTenor: null,
      remainingTenor: null,
      remainingLiability: null,
    },
    {
      id: 2,
      title: 'Kontrakan',
      cleanTitle: 'Kontrakan',
      category: 'Tagihan',
      amount: 1150000,
      type: 'cash',
      active: true,
      end_date: null,
      created_at: '4',
      isTemporary: false,
      isInstallment: false,
      totalTenor: null,
      currentTenor: null,
      remainingTenor: null,
      remainingLiability: null,
    },
    {
      id: 3,
      title: 'Cicilan Laptop (3/12)',
      cleanTitle: 'Laptop',
      category: 'Belanja Pribadi',
      amount: 1000000,
      type: 'credit_expense',
      active: true,
      end_date: '2027-07',
      created_at: '15',
      isTemporary: true,
      isInstallment: true,
      totalTenor: 12,
      currentTenor: 3,
      remainingTenor: 10,
      remainingLiability: 10000000,
    },
  ],
  pausedItems: [],
  monthlyTotal: 2336000,
  annualTotal: 26032000,
  monthlyByCategory: {
    Entertainment: 186000,
    Tagihan: 1150000,
    'Belanja Pribadi': 1000000,
  },
  monthlyByType: {
    cash: 1150000,
    credit_expense: 1186000,
    credit_payment: 0,
  },
  categoryCount: 3,
  activeCount: 3,
  temporaryCount: 1,
  largestItem: {
    id: 2,
    title: 'Kontrakan',
    cleanTitle: 'Kontrakan',
    category: 'Tagihan',
    amount: 1150000,
    type: 'cash',
    active: true,
    end_date: null,
    created_at: '4',
    isTemporary: false,
    isInstallment: false,
    totalTenor: null,
    currentTenor: null,
    remainingTenor: null,
    remainingLiability: null,
  },
  avgPerItem: 778667,
  latestIncome: 23000000,
} as unknown as RecurringCostResult;
mockAnalysisResult.activeItems = mockAnalysisResult.items;

function stubFetch() {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => mockAnalysisResult,
  }) as any;
}

describe('RecurringCostAnalyzer — Installment Liability Analyzer (PR #332 merge)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('KPI Cicilan Berjalan menampilkan beban cicilan, sisa liabilitas, dan run-rate pasca lunas', async () => {
    stubFetch();
    render(<RecurringCostAnalyzer />);

    await waitFor(() => {
      expect(screen.getByText('Cicilan Berjalan')).toBeInTheDocument();
    });

    // Nilai: beban cicilan bulanan + jumlah cicilan (unit di span terpisah)
    expect(screen.getByText('/bln · 1 cicilan')).toBeInTheDocument();
    expect(screen.getAllByText('Rp 1.000.000').length).toBeGreaterThan(0);

    // Sisa liabilitas dan proyeksi run-rate setelah semua cicilan lunas
    // (muncul di KPI card 3 DAN badge agregat roadmap — pakai getAllByText)
    expect(screen.getAllByText(/Sisa liabilitas: Rp 10.000.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Run-rate pasca lunas: Rp 1.336.000\/bln/i).length).toBeGreaterThan(0);

    // KPI Komitmen Bulanan kini memuat split langganan vs cicilan
    expect(screen.getByText(/Langganan: Rp 1.336.000/)).toBeInTheDocument();
    expect(screen.getByText(/Cicilan: Rp 1.000.000/)).toBeInTheDocument();
  });

  it('Roadmap Pelepasan Kas menampilkan badge agregat liabilitas & run-rate', async () => {
    stubFetch();
    render(<RecurringCostAnalyzer />);

    await waitFor(() => {
      expect(screen.getByText('Roadmap Pelepasan Arus Kas Cicilan')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Sisa liabilitas: Rp 10.000.000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Run-rate pasca lunas: Rp 1.336.000/bln').length).toBeGreaterThan(0);
  });

  it('tab Daftar Komitmen: filter Segmen/Langganan/Cicilan menyaring tabel + kartu mobile', async () => {
    stubFetch();
    render(<RecurringCostAnalyzer />);

    await waitFor(() => {
      expect(screen.getByText(/Recurring & Subscription Intelligence Hub/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Daftar Komitmen/i }));
    await waitFor(() => {
      expect(screen.getByText('Semua (3)')).toBeInTheDocument();
    });

    // Default Semua: 3 item aktif muncul di tabel desktop dan kartu mobile
    expect(screen.getAllByText('Netflix').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Cicilan Laptop (3/12)').length).toBeGreaterThanOrEqual(2);

    // Filter Langganan
    fireEvent.click(screen.getByText('Langganan (2)'));
    expect(screen.getAllByText('Netflix').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cicilan Laptop (3/12)')).not.toBeInTheDocument();

    // Filter Cicilan
    fireEvent.click(screen.getByText('Cicilan (1)'));
    expect(screen.getAllByText('Cicilan Laptop (3/12)').length).toBeGreaterThan(0);
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();

    // Kembali ke Semua
    fireEvent.click(screen.getByText('Semua (3)'));
    expect(screen.getAllByText('Netflix').length).toBeGreaterThan(0);
  });

  it('menampilkan tenor berjalan (3/12) dan sisa bulan pada baris cicilan', async () => {
    stubFetch();
    render(<RecurringCostAnalyzer />);

    await waitFor(() => {
      expect(screen.getByText(/Recurring & Subscription Intelligence Hub/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Daftar Komitmen/i }));
    await waitFor(() => {
      expect(screen.getByText('Semua (3)')).toBeInTheDocument();
    });

    // Tenor label (tabel desktop + kartu mobile) dan sisa tenor
    expect(screen.getAllByText('Tenor 3/12').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10 bln lagi').length).toBeGreaterThan(0);

    // Badge Cicilan di tabel desktop
    expect(screen.getAllByText('Cicilan').length).toBeGreaterThan(0);

    // Sisa liabilitas per item di kartu mobile
    expect(screen.getAllByText(/Sisa: Rp 10.000.000/).length).toBeGreaterThan(0);
  });
});
