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

describe('KseiCard — token rotation form (KUR-40 follow-up)', () => {
  const JWT =
    'eyJhbGciOiJIUzUxMiJ9.' +
    Buffer.from(JSON.stringify({ exp: 1793530000 })).toString('base64url') +
    '.sig';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('auto-opens the form while the token is expired', () => {
    render(<KseiCard data={base({ tokenExpired: true })} />);
    expect(screen.getByTestId('ksei-token-form')).toBeInTheDocument();
    expect(screen.getByTestId('ksei-token-input')).toBeInTheDocument();
    expect(screen.getByTestId('ksei-token-save')).toHaveTextContent('Simpan & refresh');
  });

  it('stays hidden with a fresh token and toggles via the badge', () => {
    render(<KseiCard data={base({ tokenExpired: true, stale: true })} />);
    expect(screen.getByTestId('ksei-token-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ksei-token-cancel')); // dismiss
    expect(screen.queryByTestId('ksei-token-form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ksei-token-expired')); // badge toggle back
    expect(screen.getByTestId('ksei-token-form')).toBeInTheDocument();
  });

  it('POSTs the pasted curl to /api/ksei/token and refreshes the card', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('/api/ksei/token')) {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true, source: 'curl', expires: '1 Nov 2026', refreshed: true }), {
            status: 200,
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify(base({ stale: false, tokenExpired: false })), { status: 200 })
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<KseiCard data={base({ tokenExpired: true, stale: true })} />);
    fireEvent.change(screen.getByTestId('ksei-token-input'), {
      target: { value: "curl -H 'Authorization: Bearer " + JWT + "' ..." },
    });
    fireEvent.click(screen.getByTestId('ksei-token-save'));

    await waitFor(() => expect(screen.getByTestId('ksei-token-msg')).toHaveTextContent('Token aktif'));
    const post = calls.find(c => c.url.includes('/api/ksei/token'));
    expect(JSON.parse(String(post?.init?.body))).toMatchObject({ refresh: true });
    expect(screen.queryByTestId('ksei-token-expired')).not.toBeInTheDocument(); // refreshed data has no expired token
  });

  it('surfaces the server error line when the save fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.includes('/api/ksei/token')
            ? new Response(JSON.stringify({ error: 'Token sudah kedaluwarsa — ambil yang baru.' }), { status: 400 })
            : new Response(JSON.stringify(base()), { status: 200 })
        )
      )
    );
    render(<KseiCard data={base({ tokenExpired: true, stale: true })} />);
    fireEvent.change(screen.getByTestId('ksei-token-input'), { target: { value: JWT } });
    fireEvent.click(screen.getByTestId('ksei-token-save'));
    await waitFor(() => expect(screen.getByTestId('ksei-token-error')).toHaveTextContent('kedaluwarsa'));
    expect(screen.getByTestId('ksei-token-form')).toBeInTheDocument(); // form stays open for a retry
  });
});
