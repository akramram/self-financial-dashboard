/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/utils', () => ({
  formatIdr: (n: number) => `IDR ${n.toLocaleString('id-ID')}`,
}));

import SafeToSpend from '../components/SafeToSpend';

const HEALTHY = {
  period_id: 44,
  period_label: 'November 2026',
  start_date: '2026-10-21',
  end_date: '2026-11-20',
  income: 20000000,
  total_spent: 5000000,
  remaining_budget: 15000000,
  days_elapsed: 10,
  days_total: 31,
  days_remaining: 21,
  daily_safe_to_spend: 714285,
  spent_today: 50000,
  left_today: 664285,
  avg_7d: 300000,
  status: 'healthy',
  time_elapsed_pct: 32,
};

const OVER = { ...HEALTHY, status: 'over', left_today: -120000, remaining_budget: -500000 };

describe('SafeToSpend — daily allowance card', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading skeleton first, then renders the big number and status badge', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(HEALTHY) } as Response)
    ));
    render(<SafeToSpend />);
    expect(screen.getByTestId('sts-loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('sts-card')).toBeInTheDocument());
    expect(screen.getByText('Sehat')).toBeInTheDocument();
    expect(screen.getByText('IDR 714.285')).toBeInTheDocument();
    expect(screen.getByText('/ hari')).toBeInTheDocument();
    expect(screen.getByText('Hari ini: IDR 50.000')).toBeInTheDocument();
    expect(screen.getByText('Sisa IDR 664.285')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument(); // days remaining
  });

  it('renders Over Budget state with negative left-today and red styling', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(OVER) } as Response)
    ));
    render(<SafeToSpend />);
    await waitFor(() => expect(screen.getByTestId('sts-card')).toBeInTheDocument());
    expect(screen.getByText('Over Budget')).toBeInTheDocument();
    expect(screen.getByText('Over IDR 120.000')).toBeInTheDocument();
  });

  it('shows neutral empty state (not error) when API returns no_active_period 404', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: 'no_active_period' }) } as unknown as Response)
    ));
    render(<SafeToSpend />);
    await waitFor(() => expect(screen.getByTestId('sts-empty')).toBeInTheDocument());
    expect(screen.getByText(/belum di-kickoff/)).toBeInTheDocument();
    expect(screen.queryByTestId('sts-error')).not.toBeInTheDocument();
    expect(screen.queryByText('Gagal memuat safe-to-spend.')).not.toBeInTheDocument();
  });

  it('shows error state with retry, and retry refetches', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(HEALTHY) } as Response);
    vi.stubGlobal('fetch', fetchMock);
    render(<SafeToSpend />);
    await waitFor(() => expect(screen.getByTestId('sts-error')).toBeInTheDocument());
    expect(screen.getByText('Gagal memuat safe-to-spend.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Coba lagi'));
    await waitFor(() => expect(screen.getByTestId('sts-card')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
