/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import FlowMapHub from '../components/FlowMapHub';
import { SankeySvg } from '../components/FlowMapHub';
import { buildFlowGraph } from '../lib/flow-analytics';

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`,
  };
});

const mockSummaries = [
  {
    period_id: 1,
    month: 'September 2026',
    income: 10_000_000,
    outcome: { cash: 5_000_000, credit_payment: 1_000_000, credit_expenses: 0, total: 6_000_000 },
    savings_rate_pct: 40,
  },
  {
    period_id: 2,
    month: 'October 2026',
    income: 10_000_000,
    outcome: { cash: 6_500_000, credit_payment: 500_000, credit_expenses: 0, total: 7_000_000 },
    savings_rate_pct: 30,
  },
];

const mockTxs = [
  { id: 1, title: 'Belanja Mingguan', category: 'Belanja', amount: 2_000_000, type: 'cash', done: 1 },
  { id: 2, title: 'Bayar CC', category: 'Kartu Kredit', amount: 1_500_000, type: 'credit_payment', done: 1 },
  { id: 3, title: 'Nabung Rutin', category: 'Invest', amount: 3_000_000, type: 'cash', done: 1 },
  { id: 4, title: 'Kopi', category: 'Kuliner', amount: 150_000, type: 'cash', done: 0 },
];

const mockCategories = [
  { id: 1, name: 'Belanja', color: '#ef4444', monthly_limit: 0 },
  { id: 2, name: 'Kartu Kredit', color: '#f59e0b', monthly_limit: 0 },
  { id: 3, name: 'Invest', color: '#10b981', monthly_limit: 0 },
];

function setupFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.startsWith('/api/summary')) {
        return Promise.resolve({ ok: true, json: async () => mockSummaries });
      }
      if (url.startsWith('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => mockCategories });
      }
      if (url.includes('period_id=2')) {
        return Promise.resolve({ ok: true, json: async () => mockTxs });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    })
  );
}

describe('FlowMapHub Component', () => {
  beforeEach(() => {
    setupFetch();
  });

  it('renders loading state then KPI cards and sankey', async () => {
    render(<FlowMapHub />);
    expect(screen.getByTestId('flow-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('flow-sankey')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Pemasukan').length).toBeGreaterThan(0);
    expect(screen.getByText('Total Keluar')).toBeInTheDocument();
    expect(screen.getAllByText('Sisa / Tabungan').length).toBeGreaterThan(0);
    expect(screen.getByText('Savings Rate')).toBeInTheDocument();
    // outflow = 2.000.000 + 1.500.000 + 3.000.000 = 6.500.000, sisa = 3.500.000
    expect(screen.getByText('Rp 6.500.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 3.500.000')).toBeInTheDocument();
  });

  it('renders insights and top flows section', async () => {
    render(<FlowMapHub />);
    await waitFor(() => {
      expect(screen.getByTestId('flow-insights')).toBeInTheDocument();
    });
    expect(screen.getByText('Konsentrasi Top 3')).toBeInTheDocument();
    expect(screen.getByText('Porsi Pelunasan Kredit')).toBeInTheDocument();
    expect(screen.getByText('Alokasi Invest')).toBeInTheDocument();
    expect(screen.getByText('Aliran Terbesar')).toBeInTheDocument();
    expect(screen.getAllByText('Invest').length).toBeGreaterThan(0);
  });

  it('renders empty state when no summaries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.startsWith('/api/summary')) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      })
    );
    render(<FlowMapHub />);
    await waitFor(() => {
      expect(screen.getByTestId('flow-empty')).toBeInTheDocument();
    });
  });

  it('renders error state with retry when summary fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false }))
    );
    render(<FlowMapHub />);
    await waitFor(() => {
      expect(screen.getByTestId('flow-error')).toBeInTheDocument();
    });
    expect(screen.getByText(/Coba Lagi/i)).toBeInTheDocument();
  });
});

describe('SankeySvg geometry', () => {
  it('renders one ribbon per link and keeps links attached to nodes', () => {
    const txs = [
      { title: 'A', category: 'Belanja', amount: 2_000_000, type: 'cash', done: 1 },
      { title: 'B', category: 'Invest', amount: 1_000_000, type: 'cash', done: 1 },
    ];
    const g = buildFlowGraph(txs, 5_000_000);
    const setHovered = () => {};
    const { container } = render(<SankeySvg graph={g} hovered={null} setHovered={setHovered} />);
    const paths = container.querySelectorAll('path');
    // 2 links (Belanja, Invest, savings) -> buildFlowGraph adds savings node too = 3 links
    expect(paths.length).toBe(3);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(g.nodes.length);
  });
});
