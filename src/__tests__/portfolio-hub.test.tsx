/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { NetworthRecord, Investment } from '../lib/data';

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `Rp ${n.toLocaleString('id-ID')}`,
    formatNumber: (n: number) => String(n),
  };
});

const { mockInvestments } = vi.hoisted(() => ({
  mockInvestments: [
    {
      id: 1,
      name: 'Bank Rakyat Indonesia',
      ticker: 'BBRI.JK',
      type: 'stock',
      quantity: 3200,
      avg_purchase_price: 3100,
      current_price: 3150,
      currency: 'IDR',
      platform: 'KSEI',
      notes: 'Long-term dividend',
      purchase_date: '2026-01-10',
      created_at: '2026-01-10T00:00:00Z',
      updated_at: '2026-01-10T00:00:00Z',
    },
  ],
}));

vi.mock('../lib/api', () => ({
  fetchInvestments: vi.fn().mockResolvedValue(mockInvestments),
  createInvestmentApi: vi.fn().mockResolvedValue({ id: 2 }),
  updateInvestmentApi: vi.fn().mockResolvedValue({ success: true }),
  deleteInvestmentApi: vi.fn().mockResolvedValue({ success: true }),
}));

import PortfolioHub from '../components/PortfolioHub';

const mockNetworthData: NetworthRecord[] = [
  {
    period_id: 1,
    month: 'October 2026',
    date: '2026-10-21',
    total: 44000000,
    currency: 'IDR',
    month_over_month_change: 2000000,
    month_over_month_pct: 4.8,
    breakdown: {
      Saham: 24000000,
      'Reksa Dana': 10000000,
      'CashCow Jenius': 7000000,
      'Saham Luar': 3000000,
    },
  },
];

describe('PortfolioHub Component', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/bbri/quote')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              quote: {
                symbol: 'BBRI.JK',
                price: 3100,
                prev_close: 3150,
                ttm_dividend: 346,
                fetched_at: '2026-10-01T10:00:00Z',
                dividends: [{ date: '2026-04-21', amount: 209 }],
              },
            }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    }) as any;
  });

  it('renders portfolio summary and top KPI cards', async () => {
    render(<PortfolioHub data={mockNetworthData} />);

    expect(screen.getByText('Total Net Worth Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Rp 44.000.000')).toBeInTheDocument();
    expect(screen.getByText('Status Rebalancing')).toBeInTheDocument();
    expect(screen.getByText(/Est\. Dividen Tahunan/i)).toBeInTheDocument();
  });

  it('allows switching between tabs', async () => {
    render(<PortfolioHub data={mockNetworthData} />);

    // Default tab is rebalancing
    expect(screen.getByText(/Target Alokasi Aset/i)).toBeInTheDocument();

    // Click Holdings tab
    const holdingsBtn = screen.getByRole('button', { name: /Holdings & Posisi/i });
    fireEvent.click(holdingsBtn);

    await waitFor(() => {
      expect(screen.getByText('Daftar Instrumen Investasi')).toBeInTheDocument();
    });

    // Click Dividend tab
    const dividendBtn = screen.getByRole('button', { name: /Radar Dividen/i });
    fireEvent.click(dividendBtn);

    expect(screen.getByText(/Bank Rakyat Indonesia \(BBRI\.JK\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Dividen TTM per Lembar/i)).toBeInTheDocument();
  });

  it('computes inflow recommendation in rebalancing tab', () => {
    render(<PortfolioHub data={mockNetworthData} />);

    expect(screen.getByText(/Rekomendasi Rebalancing via Alokasi Modal Baru/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tambah Dana:/i)).toBeInTheDocument();
  });
});
