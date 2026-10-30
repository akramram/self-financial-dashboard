/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `IDR ${Math.round(n || 0).toLocaleString('id-ID')}`,
  };
});

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (
    <div data-testid="dialog" data-open={open ? 'true' : 'false'}>
      {open ? children : null}
    </div>
  ),
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

import BudgetRecommendations, {
  roundToStep,
  computeRecommendedLimit,
  type CategoryStat,
} from '../components/BudgetRecommendations';

const mockCategoryStats: CategoryStat[] = [
  {
    categoryId: 1,
    category: 'Makan',
    periodCount: 12,
    totalSpent: 24000000,
    avgSpent: 2000000,
    medianSpent: 1950000,
    p80Spent: 2200000,
    maxSpent: 2500000,
    minSpent: 1500000,
    stdDev: 250000,
    trend: 'stable',
    trendPct: 2.1,
    volatility: 'low',
    currentLimit: 1800000, // Over budget (avg 2M > 1.8M)
    recommendedLimit: 2100000,
    confidence: 'high',
  },
  {
    categoryId: 2,
    category: 'Belanja',
    periodCount: 10,
    totalSpent: 15000000,
    avgSpent: 1500000,
    medianSpent: 1400000,
    p80Spent: 1800000,
    maxSpent: 2200000,
    minSpent: 800000,
    stdDev: 450000,
    trend: 'rising',
    trendPct: 15.4,
    volatility: 'high',
    currentLimit: 0, // No limit set
    recommendedLimit: 1650000,
    confidence: 'medium',
  },
  {
    categoryId: 3,
    category: 'Transportasi',
    periodCount: 14,
    totalSpent: 7000000,
    avgSpent: 500000,
    medianSpent: 500000,
    p80Spent: 550000,
    maxSpent: 650000,
    minSpent: 400000,
    stdDev: 60000,
    trend: 'falling',
    trendPct: -8.0,
    volatility: 'low',
    currentLimit: 550000, // On track, already matches p80
    recommendedLimit: 550000,
    confidence: 'high',
  },
];

describe('BudgetRecommendations Intelligence Hub', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url === '/api/recommendations') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCategoryStats),
        });
      }
      if (url.startsWith('/api/categories/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('calculates roundToStep correctly with 50.000 minimum and step intervals', () => {
    expect(roundToStep(0)).toBe(0);
    expect(roundToStep(24000)).toBe(50000); // Minimum step
    expect(roundToStep(1940000)).toBe(1950000);
    expect(roundToStep(2120000)).toBe(2100000);
  });

  it('computes recommended limit based on strategy (smart, conservative, strict, custom)', () => {
    const stat = mockCategoryStats[0]; // recommendedLimit: 2,100,000, median: 1,950,000

    // smart -> 2,100,000
    expect(computeRecommendedLimit(stat, 'smart')).toBe(2100000);

    // conservative (+10%) -> 2,100,000 * 1.1 = 2,310,000 rounded to 50k = 2,300,000
    expect(computeRecommendedLimit(stat, 'conservative')).toBe(2300000);

    // strict (median 1,950,000) -> 1,950,000
    expect(computeRecommendedLimit(stat, 'strict')).toBe(1950000);

    // custom (+20%) -> 2,100,000 * 1.2 = 2,520,000 rounded to 50k = 2,500,000
    expect(computeRecommendedLimit(stat, 'custom', 20)).toBe(2500000);
  });

  it('renders category stats, KPI cards, and strategy options after fetching', async () => {
    render(<BudgetRecommendations />);

    await waitFor(() => {
      expect(screen.getByText('Makan')).toBeInTheDocument();
      expect(screen.getByText('Belanja')).toBeInTheDocument();
      expect(screen.getByText('Transportasi')).toBeInTheDocument();
    });

    // Check Strategy Pills
    expect(screen.getByText('Cerdas (Default P80)')).toBeInTheDocument();
    expect(screen.getByText('Aman (+10% Buffer)')).toBeInTheDocument();
    expect(screen.getByText('Disiplin (Median)')).toBeInTheDocument();

    // Check KPI count
    expect(screen.getByText('Total Kategori')).toBeInTheDocument();
    expect(screen.getByText('Perlu Update')).toBeInTheDocument();
    expect(screen.getByText('Over Budget')).toBeInTheDocument();
    expect(screen.getByText('Tanpa Limit')).toBeInTheDocument();
  });

  it('filters rows by search query', async () => {
    render(<BudgetRecommendations />);

    await waitFor(() => {
      expect(screen.getByText('Makan')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Cari nama kategori...');
    fireEvent.change(searchInput, { target: { value: 'Belanja' } });

    expect(screen.getByText('Belanja')).toBeInTheDocument();
    expect(screen.queryByText('Makan')).not.toBeInTheDocument();
    expect(screen.queryByText('Transportasi')).not.toBeInTheDocument();
  });

  it('filters rows by status tabs (e.g. Over Budget)', async () => {
    render(<BudgetRecommendations />);

    await waitFor(() => {
      expect(screen.getByText('Makan')).toBeInTheDocument();
    });

    // Makan has avg 2M > currentLimit 1.8M -> Over Budget
    // Belanja has currentLimit 0 -> Not over budget (no limit)
    // Transportasi has avg 500k <= currentLimit 550k -> Under budget
    const overBudgetBtn = screen.getAllByRole('button', { name: /Over Budget/i })[0];
    fireEvent.click(overBudgetBtn);

    expect(screen.getByText('Makan')).toBeInTheDocument();
    expect(screen.queryByText('Transportasi')).not.toBeInTheDocument();
  });

  it('applies a single category recommendation via API call', async () => {
    render(<BudgetRecommendations />);

    await waitFor(() => {
      expect(screen.getByText('Makan')).toBeInTheDocument();
    });

    // Find "Terapkan" button for Makan
    const applyButtons = screen.getAllByRole('button', { name: 'Terapkan' });
    expect(applyButtons.length).toBeGreaterThan(0);

    fireEvent.click(applyButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/categories/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ monthly_limit: 2100000 }),
        })
      );
    });
  });

  it('opens detail modal on click and allows custom limit adjustment', async () => {
    render(<BudgetRecommendations />);

    await waitFor(() => {
      expect(screen.getByText('Makan')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: 'Detail' });
    fireEvent.click(detailButtons[0]);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
      expect(screen.getByText('Statistik pengeluaran historis dan penyesuaian limit bulanan.')).toBeInTheDocument();
    });

    // Input custom value
    const customInput = screen.getByLabelText(/Batas Limit yang Diinginkan/i);
    fireEvent.change(customInput, { target: { value: '2500000' } });

    // Click Simpan Limit Kategori
    const saveBtn = screen.getByRole('button', { name: /Simpan Limit Kategori/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/categories/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ monthly_limit: 2500000 }),
        })
      );
    });
  });
});
