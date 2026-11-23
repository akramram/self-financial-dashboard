/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';

const confirmMock = vi.fn();
vi.mock('../components/ConfirmDialog', () => ({
  confirm: (opts: unknown) => confirmMock(opts),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../lib/api', () => ({
  deleteNetworthApi: vi.fn(),
}));

import NetworthTable from '../components/NetworthTable';
import { deleteNetworthApi } from '../lib/api';
import type { NetworthRecord } from '../lib/data';

const mkRow = (periodId: number, month: string, total: number): NetworthRecord =>
  ({
    period_id: periodId,
    month,
    date: '2026-10-21',
    total,
    currency: 'IDR',
    month_over_month_change: null,
    month_over_month_pct: null,
    breakdown: {},
  }) as unknown as NetworthRecord;

const SAMPLE: NetworthRecord[] = [
  mkRow(30, 'October 2026', 10000000),
  mkRow(31, 'November 2026', 11000000),
];

// Default sort = newest first → first Delete button = November 2026 (period 31).
// jsdom renders BOTH desktop table and mobile cards → count assertions use ≥2,
// removal asserted via getAllByText length drop (2 → 0: desktop + mobile copies).
beforeEach(() => {
  vi.clearAllMocks();
  confirmMock.mockResolvedValue(true);
  (deleteNetworthApi as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe('NetworthTable delete', () => {
  it('batal di confirm → tidak memanggil API, baris tetap ada', async () => {
    confirmMock.mockResolvedValue(false);
    render(<NetworthTable networth={SAMPLE} />);

    fireEvent.click(screen.getAllByText('Delete')[0]);
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(deleteNetworthApi).not.toHaveBeenCalled();
    expect(screen.getAllByText('November 2026').length).toBe(2);
  });

  it('konfirmasi → DELETE dipanggil dengan period_id, baris hilang, toast sukses', async () => {
    render(<NetworthTable networth={SAMPLE} />);

    fireEvent.click(screen.getAllByText('Delete')[0]);
    await waitFor(() => expect(deleteNetworthApi).toHaveBeenCalledWith(31));
    expect(screen.queryByText('November 2026')).not.toBeInTheDocument();
    expect(screen.getAllByText('October 2026').length).toBe(2);
    expect(toast.success).toHaveBeenCalledWith('Data networth November 2026 dihapus');
  });

  it('API gagal (400) → baris tetap ada, toast error berpesan server', async () => {
    (deleteNetworthApi as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Hapus networth gagal (400): Invalid period_id')
    );
    render(<NetworthTable networth={SAMPLE} />);

    fireEvent.click(screen.getAllByText('Delete')[0]);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Hapus networth gagal (400): Invalid period_id'));
    expect(screen.getAllByText('November 2026').length).toBe(2);
  });
});
