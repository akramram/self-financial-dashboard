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

import KseiCard from '../components/KseiCard';
import type { KseiCardData } from '../components/KseiCard';

const FRESH: KseiCardData = {
  snapshot_date: '2026-09-30',
  total_value: 37152544.31,
  breakdown: [
    { type: 'EKUITAS', amount: 26866500, percent: 72.31 },
    { type: 'REKSADANA', amount: 10284298.08, percent: 27.68 },
    { type: 'KAS', amount: 1746.23, percent: 0.0 },
  ],
  fetched_at: new Date().toISOString(),
};

const base = (over: Partial<KseiCardData> = {}): KseiCardData => ({ ...FRESH, ...over });

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('KseiCard — render from data prop', () => {
  it('shows total value, position date, and per-type breakdown', () => {
    render(<KseiCard data={base()} />);
    expect(screen.getByTestId('ksei-card')).toBeInTheDocument();
    expect(screen.getByText('Rp 37.152.544')).toBeInTheDocument();
    expect(screen.getByText(/Total asset · posisi/)).toBeInTheDocument();
    expect(screen.getByText('Saham')).toBeInTheDocument();
    expect(screen.getByText('Reksadana')).toBeInTheDocument();
    expect(screen.getByText(/Rp 26\.866\.500/)).toBeInTheDocument();
    expect(screen.getByText(/72,3%/)).toBeInTheDocument();
    expect(screen.getByText(/27,7%/)).toBeInTheDocument();
  });

  it('renders breakdown bars for each slice', () => {
    render(<KseiCard data={base()} />);
    const bars = screen.getByTestId('ksei-card').querySelectorAll('.h-1\\.5.rounded-full');
    expect(bars.length).toBe(3); // one track bar per slice (EKUITAS, REKSADANA, KAS)
  });

  it('shows stale badge when stale is true', () => {
    render(<KseiCard data={base({ stale: true, fetched_at: new Date(Date.now() - 3 * 86400000).toISOString() })} />);
    expect(screen.getByTestId('ksei-stale')).toHaveTextContent('data 3 hr lalu');
  });

  it('shows token-expired badge when tokenExpired is true', () => {
    render(<KseiCard data={base({ tokenExpired: true })} />);
    expect(screen.getByTestId('ksei-token-expired')).toHaveTextContent('token kedaluwarsa');
  });

  it('shows skeleton while loading and error line when fetch fails', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('down')));
    vi.stubGlobal('fetch', fetchMock);
    render(<KseiCard />); // no data → self-fetch mode
    expect(screen.getByTestId('ksei-skeleton')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('ksei-error')).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});
