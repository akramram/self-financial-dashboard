/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import RealValueHub from '../components/RealValueHub';
import type { RealValueRow } from '../lib/real-value-engine';

const ROWS: RealValueRow[] = [
  { period_id: 1, month: 'January 2025', start_date: '2025-01-21', income: 10_000_000, outcome: 8_000_000, networth: null },
  { period_id: 2, month: 'November 2025', start_date: '2025-11-21', income: 11_000_000, outcome: 8_500_000, networth: null },
  { period_id: 3, month: 'November 2026', start_date: '2026-11-21', income: 12_000_000, outcome: 9_000_000, networth: null },
];

function setupFetch(ok = true, rows: RealValueRow[] | null = ROWS) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => ({ rows: rows || [] }) })
    )
  );
}

describe('RealValueHub Component', () => {
  beforeEach(() => {
    setupFetch();
  });

  it('renders loading then hub with KPIs and verdict', async () => {
    render(<RealValueHub />);
    expect(screen.getByTestId('rv-loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('rv-hub')).toBeInTheDocument());
    expect(screen.getByText('Asumsi Inflasi Tahunan')).toBeInTheDocument();
    expect(screen.getByText('Inflasi Kumulatif')).toBeInTheDocument();
    expect(screen.getByText('Perubahan Gaji Riil')).toBeInTheDocument();
    expect(screen.getByText('Perubahan Belanja Riil')).toBeInTheDocument();
    expect(screen.getByText('Surplus Riil Terakhir')).toBeInTheDocument();
    expect(screen.getByText('Surplus Riil per Periode')).toBeInTheDocument();
    // verdict exists (single-period endpoints all present)
    expect(screen.getByText('Kesimpulan Daya Beli')).toBeInTheDocument();
  });

  it('recomputes erosion callout when inflation assumption changes', async () => {
    render(<RealValueHub />);
    await waitFor(() => expect(screen.getByTestId('rv-hub')).toBeInTheDocument());
    // default 3.5% -> cumulative inflation > 0 -> erosion callout visible
    expect(screen.getByText(/setara/)).toBeInTheDocument();
    // drag slider to 0% -> factor 1 everywhere -> no erosion, real == nominal
    const slider = screen.getByRole('slider', { name: /Asumsi inflasi tahunan/ });
    fireEvent.change(slider, { target: { value: '0' } });
    await waitFor(() => expect(screen.getByText('0.0%')).toBeInTheDocument());
    expect(screen.queryByText(/Daya beli rupiah tergerus/)).not.toBeInTheDocument();
    // preset chip reflects active state selection after slider moved back
    fireEvent.click(screen.getByRole('button', { name: '3.5%' }));
    await waitFor(() => expect(screen.getByText(/Daya beli rupiah tergerus/)).toBeInTheDocument());
  });

  it('shows empty state when no periods exist', async () => {
    setupFetch(true, []);
    render(<RealValueHub />);
    await waitFor(() => expect(screen.getByTestId('rv-empty')).toBeInTheDocument());
    expect(screen.getByText(/Belum ada data periode/)).toBeInTheDocument();
  });

  it('shows error state with retry when fetch fails', async () => {
    setupFetch(false);
    render(<RealValueHub />);
    await waitFor(() => expect(screen.getByTestId('rv-error')).toBeInTheDocument());
    expect(screen.getByText(/Gagal memuat data nilai riil/)).toBeInTheDocument();
    setupFetch(true);
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => expect(screen.getByTestId('rv-hub')).toBeInTheDocument());
  });
});
