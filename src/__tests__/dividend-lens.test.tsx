/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Chart.js canvas rendering is not the subject under test — stub both charts.
vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="doughnut-stub" />,
  Bar: () => <div data-testid="bar-stub" />,
}));

import NetworthComposition from '../components/NetworthComposition';
import { computeDividendLens, MANUAL_BBRI_FALLBACK } from '../lib/dividendLens';

const freshQuote = {
  symbol: 'BBRI.JK',
  price: 3100,
  ttm_dividend: 346,
  fetched_at: new Date().toISOString(), // now → fresh
};

const staleQuote = {
  ...freshQuote,
  fetched_at: '2026-10-01T10:07:45.742Z', // 9d old → stale
};

const networthData = [
  {
    month: 'September 2026',
    date: '2026-09-21',
    total: 41721585,
    breakdown: { Saham: 28081000, 'Reksa Dana': 5108514, 'CashCow Jenius': 5514842 },
  },
  {
    month: 'October 2026',
    date: '2026-10-21',
    total: 45505729,
    breakdown: { Saham: 27083500, 'Reksa Dana': 10304587, 'CashCow Jenius': 5486503 },
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('computeDividendLens', () => {
  it('live: fresh quote → yield = ttm/price × 100, income = yield × sahamValue', () => {
    const lens = computeDividendLens({ quote: freshQuote, stale: false, sahamValue: 27_083_500 });
    expect(lens.source).toBe('live');
    expect(lens.ttmYieldPct).toBeCloseTo(11.16, 2);
    expect(lens.projectedAnnualDividend).toBeCloseTo((346 / 3100) * 27_083_500, 4);
  });

  it('manual: stale quote falls back to const yield and flags source=manual', () => {
    const lens = computeDividendLens({ quote: staleQuote, stale: true, sahamValue: 27_083_500 });
    expect(lens.source).toBe('manual');
    expect(lens.ttmYieldPct).toBe(MANUAL_BBRI_FALLBACK.ttmYieldPct);
    expect(lens.projectedAnnualDividend).toBeCloseTo(0.112 * 27_083_500, 4);
  });

  it('manual: missing quote also falls back', () => {
    const lens = computeDividendLens({ quote: null, stale: true, sahamValue: 1_000_000 });
    expect(lens.source).toBe('manual');
    expect(lens.ttmYieldPct).toBe(MANUAL_BBRI_FALLBACK.ttmYieldPct);
  });

  it('hides metrics when ttm_dividend is 0 (no NaN)', () => {
    const lens = computeDividendLens({
      quote: { ...freshQuote, ttm_dividend: 0 },
      stale: false,
      sahamValue: 27_083_500,
    });
    expect(lens.ttmYieldPct).toBeNull();
    expect(lens.projectedAnnualDividend).toBeNull();
    expect(lens.source).toBeNull();
  });

  it('hides metrics when price is 0', () => {
    const lens = computeDividendLens({
      quote: { ...freshQuote, price: 0 },
      stale: false,
      sahamValue: 27_083_500,
    });
    expect(lens.source).toBeNull();
  });

  it('hides metrics when sahamValue <= 0', () => {
    const lens = computeDividendLens({ quote: freshQuote, stale: false, sahamValue: 0 });
    expect(lens.source).toBeNull();
  });
});

describe('NetworthComposition dividend lens UI', () => {
  it('shows live TTM yield + projected dividend + aggregate card, no manual badge', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ quote: freshQuote, stale: false }) })
    );

    render(<NetworthComposition data={networthData as any} />);

    // Await the LIVE projected value (fetch state applied) — the manual first
    // paint already contains the card title, so this must be the waiter.
    // Shown twice by design: aggregate card + per-asset 'Saham' row.
    const projected = (346 / 3100) * 27_083_500;
    const projectedNodes = await screen.findAllByText('IDR ' + Math.round(projected).toLocaleString('id-ID'));
    expect(projectedNodes.length).toBe(2);

    // Fase B aggregate card above Investment Details
    expect(screen.getByText('Dividend Income (Est.)')).toBeInTheDocument();
    expect(screen.queryByTestId('dividend-manual-badge')).toBeNull();

    // Fase A rows inside Investment Details 'Saham' card
    expect(screen.getByText('TTM Yield')).toBeInTheDocument();
    expect(screen.getByText('Dividend / yr')).toBeInTheDocument();

    // portfolio yield = projected / 45,505,729
    expect(screen.getByText(/of IDR 45\.505\.729 total/)).toBeInTheDocument();
  });

  it('stale quote → manual estimate badge shown', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ quote: staleQuote, stale: true }) })
    );

    render(<NetworthComposition data={networthData as any} />);

    expect(await screen.findByTestId('dividend-manual-badge')).toBeInTheDocument();
    expect(screen.getByText('(manual estimate)')).toBeInTheDocument(); // per-asset inline note
    expect(screen.getByText('11,2%')).toBeInTheDocument();
  });

  it('fetch failure → still renders full UI with manual fallback (no crash, no block)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<NetworthComposition data={networthData as any} />);

    expect(await screen.findByTestId('dividend-manual-badge')).toBeInTheDocument();
    expect(screen.getByText('Investment Details')).toBeInTheDocument();
    expect(screen.getByText('11,2%')).toBeInTheDocument();
  });

  it('no Saham asset → no dividend card at all', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ quote: freshQuote, stale: false }) })
    );

    render(
      <NetworthComposition
        data={
          [
            {
              month: 'October 2026',
              date: '2026-10-21',
              total: 5_000_000,
              breakdown: { 'Reksa Dana': 5_000_000 },
            },
          ] as any
        }
      />
    );

    await waitFor(() => expect(screen.getByText('Investment Details')).toBeInTheDocument());
    expect(screen.queryByText('Dividend Income (Est.)')).toBeNull();
    expect(screen.queryByText('TTM Yield')).toBeNull();
  });
});
