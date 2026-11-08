/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SpendingMixHub from '../components/SpendingMixHub';

// Mock chart.js to prevent canvas errors in jsdom
vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="doughnut-chart">Mock Doughnut Chart</div>,
  Line: () => <div data-testid="line-chart">Mock Line Chart</div>,
}));

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`,
  };
});

const mockPayload = {
  periods: [
    {
      period_id: 1,
      month: 'September 2026',
      recurring: 4_000_000,
      discretionary: 6_000_000,
      total: 10_000_000,
      recurring_pct: 40,
      discretionary_pct: 60,
      recurring_count: 5,
      discretionary_count: 20,
    },
    {
      period_id: 2,
      month: 'October 2026',
      recurring: 4_500_000,
      discretionary: 5_500_000,
      total: 10_000_000,
      recurring_pct: 45,
      discretionary_pct: 55,
      recurring_count: 6,
      discretionary_count: 25,
    },
  ],
  current: {
    period_id: 2,
    month: 'October 2026',
    recurring: 4_500_000,
    discretionary: 5_500_000,
    total: 10_000_000,
    recurring_pct: 45,
    discretionary_pct: 55,
    recurring_count: 6,
    discretionary_count: 25,
  },
  topRecurring: [
    { title: 'Kontrakan Rumah', category: 'Tagihan', amount: 1_200_000 },
    { title: 'Listrik PLN', category: 'Tagihan', amount: 500_000 },
  ],
  topDiscretionary: [
    { title: 'Belanja Supermarket', category: 'Groceries', amount: 800_000 },
    { title: 'Makan Bareng Teman', category: 'Food', amount: 350_000 },
  ],
  discretionaryCategories: [
    { category: 'Belanja Online', amount: 2_500_000, pct: 45.5 },
    { category: 'Groceries', amount: 2_000_000, pct: 36.4 },
    { category: 'Transport', amount: 1_000_000, pct: 18.1 },
  ],
  recurringCategories: [
    { category: 'Tagihan', amount: 4_500_000, pct: 100 },
  ],
  periodTransactions: [
    {
      id: 101,
      title: 'Kontrakan Rumah',
      category: 'Tagihan',
      amount: 1_200_000,
      is_recurring: true,
      date: '2026-10-21',
    },
    {
      id: 102,
      title: 'Belanja Supermarket',
      category: 'Groceries',
      amount: 800_000,
      is_recurring: false,
      date: '2026-10-22',
    },
    {
      id: 103,
      title: 'Kopi Kenangan',
      category: 'Cafe',
      amount: 45_000,
      is_recurring: false,
      date: '2026-10-25',
    },
  ],
};

describe('SpendingMixHub Component', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPayload,
      })
    );
  });

  it('renders loading state initially and then displays KPI cards', async () => {
    render(<SpendingMixHub />);

    expect(screen.getByText(/Memuat Spending Mix/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Spending Mix & Agility Hub')).toBeInTheDocument();
    });

    // Check KPI cards
    expect(screen.getByText('Skor Ketangkasan')).toBeInTheDocument();
    expect(screen.getByText('Belanja Fleksibel')).toBeInTheDocument();
    expect(screen.getByText('Komitmen Tetap')).toBeInTheDocument();
    expect(screen.getByText('Tren Biaya Tetap')).toBeInTheDocument();
  });

  it('renders overview tab with charts and insights', async () => {
    render(<SpendingMixHub />);

    await waitFor(() => {
      expect(screen.getByText('Spending Mix & Agility Hub')).toBeInTheDocument();
    });

    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByText(/Prinsip Ketangkasan Operasional/i)).toBeInTheDocument();
  });

  it('switches to simulation tab and updates cut calculations', async () => {
    render(<SpendingMixHub />);

    await waitFor(() => {
      expect(screen.getByText('Spending Mix & Agility Hub')).toBeInTheDocument();
    });

    const simTab = screen.getByRole('button', { name: /Simulasi Survival Mode/i });
    fireEvent.click(simTab);

    expect(screen.getByText(/Kalkulator Pemangkasan Belanja Darurat/i)).toBeInTheDocument();
    expect(screen.getByText('Dana Bebas per Bulan')).toBeInTheDocument();

    // Click on 50% preset button
    const preset50 = screen.getByRole('button', { name: /50% \(Hemat Ketat\)/i });
    fireEvent.click(preset50);

    // 50% of 5,500,000 is 2,750,000
    expect(screen.getByText(/\+Rp 2\.750\.000/i)).toBeInTheDocument();
  });

  it('switches to elasticity tab and displays categorized items', async () => {
    render(<SpendingMixHub />);

    await waitFor(() => {
      expect(screen.getByText('Spending Mix & Agility Hub')).toBeInTheDocument();
    });

    const elastTab = screen.getByRole('button', { name: /Elastisitas Belanja Variabel/i });
    fireEvent.click(elastTab);

    expect(screen.getByText('Profil Elastisitas Belanja Variabel')).toBeInTheDocument();
    expect(screen.getByText('Sangat Elastis')).toBeInTheDocument();
    expect(screen.getByText('Belanja Online')).toBeInTheDocument();
  });

  it('switches to audit tab and filters transactions', async () => {
    render(<SpendingMixHub />);

    await waitFor(() => {
      expect(screen.getByText('Spending Mix & Agility Hub')).toBeInTheDocument();
    });

    const auditTab = screen.getByRole('button', { name: /Audit Transaksi/i });
    fireEvent.click(auditTab);

    expect(screen.getByText(/Audit Transaksi: Tetap vs Fleksibel/i)).toBeInTheDocument();
    expect(screen.getByText('Kontrakan Rumah')).toBeInTheDocument();
    expect(screen.getByText('Belanja Supermarket')).toBeInTheDocument();

    // Filter to only recurring
    const recFilterBtn = screen.getByRole('button', { name: /Komitmen Tetap \(Recurring\)/i });
    fireEvent.click(recFilterBtn);

    expect(screen.getByText('Kontrakan Rumah')).toBeInTheDocument();
    expect(screen.queryByText('Belanja Supermarket')).not.toBeInTheDocument();
  });
});
