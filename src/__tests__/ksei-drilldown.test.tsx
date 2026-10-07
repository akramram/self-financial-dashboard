/**
 * @vitest-environment jsdom
 * KUR-145 — drill-down integration: slice buttons on KseiCard open
 * KseiDrilldownSheet; sheet states + a11y per spec KUR-144 §5/§6.
 */
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

// jsdom lacks pieces Radix needs (spec §5 relies on the real Sheet patterns).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// Radix uses dialog capture/escape helpers; jsdom lacks el.scrollIntoView in
// some versions — harmless no-op stubs only if missing.
if (!(Element.prototype as any).scrollIntoView) {
  (Element.prototype as any).scrollIntoView = () => {};
}

const fetchMock = vi.fn();
function jsonResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

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

const EQUITY_BODY = {
  snapshot_date: '2026-09-30',
  fetched_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // fresh
  stale: false,
  tokenExpired: false,
  instruments: [
    { code: 'BBCA', name: 'Bank Central Asia', value: 10550000, volume: 200 },
    { code: 'BBRI', name: 'Bank Rakyat Indonesia', value: 6480000, volume: 1500 },
  ],
};

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Re-created per test so each starts with the card closed.
function renderCard(over: Partial<KseiCardData> = {}) {
  return render(<KseiCard data={base(over)} />);
}

describe('KUR-145 — slice buttons on KseiCard', () => {
  it('EKUITAS & REKSADANA are real buttons with dialog a11y wiring', () => {
    renderCard();
    for (const t of ['ekuitas', 'reksadana']) {
      const btn = screen.getByTestId(`ksei-slice-${t}`);
      expect(btn.tagName).toBe('BUTTON');
      expect(btn).toHaveAttribute('aria-haspopup', 'dialog');
      expect(btn).toHaveAttribute('aria-controls', `ksei-drilldown-${t}`);
      expect(btn.className).toContain('min-h-[44px]');
    }
    // aria-label carries label + amount + percent (spec §6)
    expect(screen.getByTestId('ksei-slice-ekuitas')).toHaveAccessibleName(
      'Lihat instrumen Saham, Rp 26.866.500, 72,3%'
    );
  });

  it('KAS slice is NOT interactive (no button, no dialog semantics)', () => {
    renderCard();
    expect(screen.queryByTestId('ksei-slice-kas')).toBeNull();
    const kas = screen.getByText('Kas').closest('div.min-h-\\[44px\\]');
    expect(kas).not.toBeNull();
    expect(kas!.tagName).toBe('DIV');
  });

  it('clicking the EKUITAS slice opens the sheet with header + description', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, EQUITY_BODY));
    renderCard();
    fireEvent.click(screen.getByTestId('ksei-slice-ekuitas'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('id', 'ksei-drilldown-ekuitas');
    // SheetTitle = "{label} · {amount}" (spec §6)
    expect(screen.getByText(/Saham · Rp 26\.866\.500/)).toBeInTheDocument();
    // SheetDescription = "Posisi {date}" (spec §6, description USED)
    expect(screen.getByText(/Posisi 30 Sep 2026/)).toBeInTheDocument();
  });
});

describe('KUR-145 — sheet states (spec §5)', () => {
  it('loading: 4 skeletons with testid ksei-drilldown-loading', async () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never settles
    renderCard();
    fireEvent.click(screen.getByTestId('ksei-slice-ekuitas'));
    await screen.findByRole('dialog');
    expect(screen.getByTestId('ksei-drilldown-loading')).toBeInTheDocument();
  });

  it('normal: rows sorted by value desc with client-side % and lembar', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        ...EQUITY_BODY,
        instruments: [EQUITY_BODY.instruments[1], EQUITY_BODY.instruments[0]], // shuffled
      })
    );
    renderCard();
    fireEvent.click(screen.getByTestId('ksei-slice-ekuitas'));
    await screen.findByRole('dialog');
    await waitFor(() => expect(screen.getByText('BBCA')).toBeInTheDocument());
    const rows = document.querySelectorAll('[role="dialog"] ul > li');
    expect(rows).toHaveLength(2);
    // value desc: BBCA first
    expect(rows[0].textContent).toContain('BBCA');
    expect(rows[0].textContent).toContain('Rp 10.550.000');
    // client-side % of class: 10550000/26866500 = 39.3%
    expect(rows[0].textContent).toContain('39,3%');
    expect(rows[0].textContent).toContain('200 lembar');
    expect(rows[1].textContent).toContain('BBRI');
    // 6480000/26866500 = 24,1%
    expect(rows[1].textContent).toContain('24,1%');
  });

  it('empty (404 nothing cached): defensive empty message, no error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'Belum ada data', tokenExpired: false }));
    renderCard();
    fireEvent.click(screen.getByTestId('ksei-slice-reksadana'));
    await screen.findByRole('dialog');
    await waitFor(() =>
      expect(screen.getByTestId('ksei-drilldown-empty')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('ksei-drilldown-error')).toBeNull();
  });

  it('error (non-404): inline message + Coba lagi refetches (spec §5.5)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(502, { error: 'boom' }))
      .mockResolvedValueOnce(jsonResponse(200, EQUITY_BODY));
    renderCard();
    fireEvent.click(screen.getByTestId('ksei-slice-ekuitas'));
    await screen.findByRole('dialog');
    await waitFor(() =>
      expect(screen.getByTestId('ksei-drilldown-error')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /Coba lagi/i }));
    await waitFor(() => expect(screen.getByText('BBCA')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('type=EKUITAS');
  });

  it('stale cache: amber badge "data N hr lalu" under the header (spec §5.4)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        ...EQUITY_BODY,
        stale: true,
        fetched_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      })
    );
    renderCard();
    fireEvent.click(screen.getByTestId('ksei-slice-ekuitas'));
    await screen.findByRole('dialog');
    const badge = await screen.findByTestId('ksei-drilldown-stale');
    expect(badge).toHaveTextContent('data 3 hr lalu');
    expect(badge.className).toContain('bg-amber-500/15');
    // list still renders alongside the badge (cache basi — spec §5.4)
    await waitFor(() => expect(screen.getByText('BBCA')).toBeInTheDocument());
  });

  it('token expired: rose banner with Perbarui token → closes sheet + opens card token form (spec §5.6)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { ...EQUITY_BODY, tokenExpired: true })
    );
    renderCard();
    fireEvent.click(screen.getByTestId('ksei-slice-ekuitas'));
    await screen.findByRole('dialog');
    const rotate = await screen.findByTestId('ksei-drilldown-rotate-token');
    fireEvent.click(rotate);
    // Sheet closes, card's inline token form opens (sheet never writes back — spec §2)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByTestId('ksei-token-form')).toBeInTheDocument();
  });
});

describe('KUR-145 — fetch lifecycle', () => {
  it('refetches on every open; aborts in-flight on close (spec §2)', async () => {
    let rejectRef: ((e: unknown) => void) | null = null;
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_res, rej) => {
          rejectRef = rej;
          // keep the signal referenced so the abort path runs
          init?.signal?.addEventListener('abort', () =>
            rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        })
    );
    renderCard();
    fireEvent.click(screen.getByTestId('ksei-slice-ekuitas'));
    await screen.findByRole('dialog');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document.querySelector('[role="dialog"]')!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(rejectRef).not.toBeNull()); // aborted, not hung
    // Reopen → second fetch (fresh per open)
    fireEvent.click(screen.getByTestId('ksei-slice-ekuitas'));
    await screen.findByRole('dialog');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('requests the right type param per slice', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { ...EQUITY_BODY, instruments: [] })
    );
    renderCard();
    fireEvent.click(screen.getByTestId('ksei-slice-reksadana'));
    await screen.findByRole('dialog');
    await waitFor(() =>
      expect(screen.getByTestId('ksei-drilldown-empty')).toBeInTheDocument()
    );
    expect(fetchMock.mock.calls[0][0]).toContain('type=REKSADANA');
  });
});
