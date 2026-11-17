/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import DataHealthHub from '../components/DataHealthHub';
import type { DiagnosticsReport } from '../lib/data-diagnostics';

const dirtyReport: DiagnosticsReport = {
  score: 82,
  label: 'Baik',
  checkedAt: '2026-11-17T10:00:00.000Z',
  totals: { transactions: 120, periods: 14, categories: 9 },
  findings: [
    {
      id: 'orphan_transactions',
      title: 'Transaksi Yatim',
      severity: 'high',
      count: 7,
      description: 'Transaksi menunjuk period_id yang tidak ada di tabel periods.',
      hint: 'Pindahkan ke periode yang benar.',
      samples: ['#9 "Cheat Meal" (Rp50.000, 2026-05-31)', '#10 "Cheat Meal 2" (Rp50.000, 2026-05-31)'],
    },
    {
      id: 'zero_amount',
      title: 'Transaksi Nominal Nol',
      severity: 'low',
      count: 0,
      description: 'Baris bernilai 0 memenuhi chart.',
      hint: 'Hapus atau isi nominal.',
      samples: [],
    },
  ],
};

const cleanReport: DiagnosticsReport = {
  ...dirtyReport,
  score: 100,
  label: 'Sangat Sehat',
  findings: dirtyReport.findings.map((f) => ({ ...f, count: 0, samples: [] })),
};

function setupFetch(report: DiagnosticsReport, fail = false) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        fail
          ? { ok: false, json: async () => ({}) }
          : { ok: true, json: async () => report }
      )
    )
  );
}

describe('DataHealthHub Component', () => {
  beforeEach(() => {
    setupFetch(dirtyReport);
  });

  it('renders loading, then score ring, totals, and active finding cards', async () => {
    render(<DataHealthHub />);
    expect(screen.getByTestId('diagnostics-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('diagnostics-hub')).toBeInTheDocument();
    });

    expect(screen.getByTestId('diagnostics-score')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Skor kesehatan data 82')
    );
    expect(screen.getByText('120 transaksi, 14 periode, 9 kategori')).toBeInTheDocument();
    expect(screen.getByTestId('finding-orphan_transactions')).toBeInTheDocument();
    expect(screen.getByText('Perlu Perhatian (1)')).toBeInTheDocument();
    // Zero-count check renders as a passed chip, not a card.
    expect(screen.queryByTestId('finding-zero_amount')).not.toBeInTheDocument();
    expect(screen.getByText('Transaksi Nominal Nol')).toBeInTheDocument();
  });

  it('expands sample rows on demand', async () => {
    const user = userEvent.setup();
    render(<DataHealthHub />);
    await waitFor(() => screen.getByTestId('diagnostics-hub'));

    expect(screen.queryByText('#9 "Cheat Meal" (Rp50.000, 2026-05-31)')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lihat contoh' }));
    expect(screen.getByText('#9 "Cheat Meal" (Rp50.000, 2026-05-31)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sembunyikan contoh' })).toBeInTheDocument();
  });

  it('shows the all-clear state when no findings are active', async () => {
    setupFetch(cleanReport);
    render(<DataHealthHub />);
    await waitFor(() => {
      expect(screen.getByTestId('diagnostics-clean')).toBeInTheDocument();
    });
    expect(screen.getByText('Semua pemeriksaan lolos')).toBeInTheDocument();
  });

  it('shows error state with retry', async () => {
    setupFetch(dirtyReport, true);
    render(<DataHealthHub />);
    await waitFor(() => {
      expect(screen.getByTestId('diagnostics-error')).toBeInTheDocument();
    });
    const user = userEvent.setup();
    setupFetch(dirtyReport);
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => {
      expect(screen.getByTestId('diagnostics-hub')).toBeInTheDocument();
    });
  });
});
