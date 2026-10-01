/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

let syncCb: (() => void) | null = null;
vi.mock('../lib/dataSync', () => ({
  onDataChanged: (cb: () => void) => {
    syncCb = cb;
    return () => {
      syncCb = null;
    };
  },
  notifyDataChanged: () => {},
}));

import BbriCard from '../components/BbriCard';
import type { BbriCardData } from '../components/BbriCard';

const FRESH: BbriCardData = {
  symbol: 'BBRI.JK',
  price: 3140,
  prev_close: 3150,
  ttm_dividend: 346,
  fetched_at: new Date().toISOString(),
  last_dividend_date: '2026-09-04',
  dividends: [
    { date: '2026-09-04', amount: 209 },
    { date: '2026-02-27', amount: 137 },
  ],
};

const base = (over: Partial<BbriCardData> = {}): BbriCardData => ({ ...FRESH, ...over });

describe('BbriCard — render from data prop', () => {
  it('shows TTM yield, price with delta, holding value, and dividend row', () => {
    render(<BbriCard data={base()} />);
    // yield = 346 / 3140 = 11.02%
    expect(screen.getByText('11,02%')).toBeInTheDocument();
    expect(screen.getByText('TTM')).toBeInTheDocument();
    expect(screen.getByText('Rp 3.140')).toBeInTheDocument();
    expect(screen.getByText(/▼ 10/)).toBeInTheDocument();
    expect(screen.getByText(/32 lot/)).toBeInTheDocument();
    expect(screen.getByText(/Rp 10\.048\.000/)).toBeInTheDocument(); // 3140 × 3200
    expect(screen.getByText(/Dividen 12 bln: Rp 346\/share/)).toBeInTheDocument();
    expect(screen.getByText(/Rp 1\.107\.200\/thn/)).toBeInTheDocument(); // 346 × 3200
  });

  it('expands dividend history inline on click and collapses on second click', () => {
    render(<BbriCard data={base()} />);
    expect(screen.queryByText('Histori Dividen')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('bbri-card'));
    expect(screen.getByText('Histori Dividen')).toBeInTheDocument();
    expect(screen.getByText('4 Sep 2026')).toBeInTheDocument();
    expect(screen.getByText('Rp 209/share')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('bbri-card'));
    expect(screen.queryByText('Histori Dividen')).not.toBeInTheDocument();
  });
});

describe('BbriCard — stale state', () => {
  it('still renders data and shows amber "data X hr lalu" chip when stale', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    render(<BbriCard data={base({ stale: true, fetched_at: threeDaysAgo })} />);
    expect(screen.getByTestId('bbri-stale').textContent).toContain('data 3 hr lalu');
    // data still visible
    expect(screen.getByText('Rp 3.140')).toBeInTheDocument();
    expect(screen.getByText('11,02%')).toBeInTheDocument();
  });

  it('does not show stale chip for fresh data', () => {
    render(<BbriCard data={base()} />);
    expect(screen.queryByTestId('bbri-stale')).not.toBeInTheDocument();
  });
});

describe('BbriCard — loading & error state', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    syncCb = null;
  });

  it('shows skeleton while cache is empty and fetch is pending', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    render(<BbriCard />);
    expect(screen.getByTestId('bbri-skeleton')).toBeInTheDocument();
  });

  it('shows single-line inline error when fetch fails with empty cache (no toast)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    render(<BbriCard />);
    await waitFor(() => expect(screen.getByTestId('bbri-error')).toBeInTheDocument());
    expect(screen.getByTestId('bbri-error').textContent).toContain('Gagal memuat');
  });

  it('keeps showing cached data + inline note when a background re-sync fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(FRESH) })
      .mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    render(<BbriCard />);
    await waitFor(() => expect(screen.getByText('Rp 3.140')).toBeInTheDocument());
    // dashboard data-changed hook triggers a refetch, which now fails
    syncCb?.();
    await waitFor(() => expect(screen.getByTestId('bbri-error')).toBeInTheDocument());
    // cached numbers stay on screen
    expect(screen.getByText('Rp 3.140')).toBeInTheDocument();
    expect(screen.getByText('11,02%')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
