/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import RecurringCostAnalyzer from '../components/RecurringCostAnalyzer';

// Mock chart.js to prevent canvas errors in jsdom
vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="doughnut-chart">Mock Doughnut Chart</div>,
}));

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`,
  };
});

const mockRecurringData = {
  items: [
    {
      id: 1,
      title: 'Kontrakan',
      category: 'Tagihan',
      amount: 1150000,
      type: 'cash' as const,
      active: true,
      end_date: null,
      isTemporary: false,
    },
    {
      id: 2,
      title: 'Uang Istri',
      category: 'Istri',
      amount: 3000000,
      type: 'cash' as const,
      active: true,
      end_date: null,
      isTemporary: false,
    },
    {
      id: 3,
      title: 'Youtube Premium',
      category: 'Tagihan',
      amount: 154000,
      type: 'credit_expense' as const,
      active: true,
      end_date: null,
      isTemporary: false,
    },
    {
      id: 4,
      title: 'Cicilan Inverter',
      category: 'Tagihan',
      amount: 1100000,
      type: 'credit_expense' as const,
      active: true,
      end_date: '2026-12',
      isTemporary: true,
    },
    {
      id: 5,
      title: 'Gym Membership',
      category: 'Kesehatan',
      amount: 350000,
      type: 'cash' as const,
      active: false,
      end_date: null,
      isTemporary: false,
    },
  ],
  activeItems: [
    {
      id: 1,
      title: 'Kontrakan',
      category: 'Tagihan',
      amount: 1150000,
      type: 'cash' as const,
      active: true,
      end_date: null,
      isTemporary: false,
    },
    {
      id: 2,
      title: 'Uang Istri',
      category: 'Istri',
      amount: 3000000,
      type: 'cash' as const,
      active: true,
      end_date: null,
      isTemporary: false,
    },
    {
      id: 3,
      title: 'Youtube Premium',
      category: 'Tagihan',
      amount: 154000,
      type: 'credit_expense' as const,
      active: true,
      end_date: null,
      isTemporary: false,
    },
    {
      id: 4,
      title: 'Cicilan Inverter',
      category: 'Tagihan',
      amount: 1100000,
      type: 'credit_expense' as const,
      active: true,
      end_date: '2026-12',
      isTemporary: true,
    },
  ],
  pausedItems: [
    {
      id: 5,
      title: 'Gym Membership',
      category: 'Kesehatan',
      amount: 350000,
      type: 'cash' as const,
      active: false,
      end_date: null,
      isTemporary: false,
    },
  ],
  monthlyTotal: 5404000,
  annualTotal: 64848000,
  monthlyByCategory: {
    Tagihan: 2404000,
    Istri: 3000000,
  },
  monthlyByType: {
    cash: 4150000,
    credit_expense: 1254000,
    credit_payment: 0,
  },
  categoryCount: 2,
  activeCount: 4,
  temporaryCount: 1,
  largestItem: {
    id: 2,
    title: 'Uang Istri',
    category: 'Istri',
    amount: 3000000,
    type: 'cash' as const,
    active: true,
    end_date: null,
    isTemporary: false,
  },
  avgPerItem: 1351000,
  latestIncome: 23000000,
};

describe('RecurringCostAnalyzer Hub Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state then renders overview with KPI cards and radar', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRecurringData,
    }) as any;

    render(<RecurringCostAnalyzer />);

    // Hub Title
    await waitFor(() => {
      expect(screen.getByText(/Recurring & Subscription Intelligence Hub/i)).toBeInTheDocument();
    });

    // Overview KPIs
    expect(screen.getByText('Komitmen Bulanan')).toBeInTheDocument();
    expect(screen.getByText('Rasio Beban Rutin')).toBeInTheDocument();
    expect(screen.getByText('Cicilan Berjangka')).toBeInTheDocument();
    expect(screen.getByText('Item Terbesar')).toBeInTheDocument();

    // Check burden badge
    expect(screen.getByText(/Moderat/i)).toBeInTheDocument();

    // Check pillar section
    expect(screen.getByText('Pilar Komitmen & Distribusi Beban Finansial')).toBeInTheDocument();
    expect(screen.getByText('Komposisi Kategori Komitmen')).toBeInTheDocument();
    expect(screen.getByText('Roadmap Pelepasan Arus Kas Cicilan')).toBeInTheDocument();
  });

  it('switches to Simulator Kill-Switch tab, applies preset and updates projections', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRecurringData,
    }) as any;

    render(<RecurringCostAnalyzer />);

    await waitFor(() => {
      expect(screen.getByText(/Recurring & Subscription Intelligence Hub/i)).toBeInTheDocument();
    });

    // Click tab simulator
    const simTabBtn = screen.getByRole('button', { name: /Simulator Kill-Switch/i });
    fireEvent.click(simTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Simulator Pemangkasan Komitmen (What-If Kill-Switch)')).toBeInTheDocument();
    });

    expect(screen.getByText('Kas Bulanan Terbebas')).toBeInTheDocument();
    expect(screen.getByText('Sisa Komitmen Rutin')).toBeInTheDocument();
    expect(screen.getByText('Efek Pengganda Kekayaan 5 Tahun (The Subscription Multiplier)')).toBeInTheDocument();

    // Click preset "Pangkas Streaming"
    const streamingPresetBtn = screen.getByRole('button', { name: 'Pangkas Streaming' });
    fireEvent.click(streamingPresetBtn);

    await waitFor(() => {
      // Should cut Youtube Premium (154,000)
      expect(screen.getByText('+Rp 154.000')).toBeInTheDocument();
    });

    // Click preset "Simulasi Bebas Cicilan"
    const tempPresetBtn = screen.getByRole('button', { name: 'Simulasi Bebas Cicilan' });
    fireEvent.click(tempPresetBtn);

    await waitFor(() => {
      // Should cut Cicilan Inverter (1,100,000)
      expect(screen.getByText('+Rp 1.100.000')).toBeInTheDocument();
    });
  });

  it('switches to Daftar Komitmen table and allows searching', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRecurringData,
    }) as any;

    render(<RecurringCostAnalyzer />);

    await waitFor(() => {
      expect(screen.getByText(/Recurring & Subscription Intelligence Hub/i)).toBeInTheDocument();
    });

    // Click tab table
    const tableTabBtn = screen.getByRole('button', { name: /Daftar Komitmen/i });
    fireEvent.click(tableTabBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Cari nama komitmen atau kategori/i)).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('Nama Komitmen')).toBeInTheDocument();
    expect(screen.getByText('Kontrakan')).toBeInTheDocument();
    expect(screen.getByText('Uang Istri')).toBeInTheDocument();

    // Search query
    const searchInput = screen.getByPlaceholderText(/Cari nama komitmen atau kategori/i);
    fireEvent.change(searchInput, { target: { value: 'Inverter' } });

    expect(screen.getByText('Cicilan Inverter')).toBeInTheDocument();
    expect(screen.queryByText('Kontrakan')).not.toBeInTheDocument();
  });

  it('renders clean empty state when no recurring items exist', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        activeItems: [],
        pausedItems: [],
        monthlyTotal: 0,
        annualTotal: 0,
        monthlyByCategory: {},
        monthlyByType: { cash: 0, credit_expense: 0, credit_payment: 0 },
        categoryCount: 0,
        activeCount: 0,
        temporaryCount: 0,
        largestItem: null,
        avgPerItem: 0,
        latestIncome: 0,
      }),
    }) as any;

    render(<RecurringCostAnalyzer />);

    await waitFor(() => {
      expect(screen.getByText('Belum Ada Transaksi Berulang')).toBeInTheDocument();
    });
  });
});
