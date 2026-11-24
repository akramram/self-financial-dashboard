/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { DEFAULT_SINKING_FUNDS, type SinkingFund } from '../lib/sinking-funds-engine';

const { confirmMock, toastSuccess } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('../components/ConfirmDialog', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: vi.fn() },
}));

import SinkingFundsHub from '../components/SinkingFundsHub';

const STORAGE_KEY = 'findash_sinking_funds_v1';

const CUSTOM_FUND: SinkingFund = {
  id: 'sf-custom-test',
  name: 'Dana Liburan Custom',
  category: 'lifestyle',
  priority: 'low',
  targetAmount: 10000000,
  currentAmount: 1000000,
  targetDate: '2027-12-20',
  icon: 'car',
  notes: '',
};

describe('SinkingFundsHub Component', () => {
  beforeEach(() => {
    localStorage.clear();
    confirmMock.mockReset();
    toastSuccess.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders overview metrics and default funds', () => {
    render(<SinkingFundsHub />);

    expect(screen.getByText('Total Dana Terkumpul')).toBeInTheDocument();
    expect(screen.getByText('Setoran Wajib / Bulan')).toBeInTheDocument();
    expect(screen.getByText('Kesehatan Pos Dana')).toBeInTheDocument();
    expect(screen.getByText('Kapasitas Tabungan')).toBeInTheDocument();

    // Default funds check via heading role
    expect(screen.getByRole('heading', { name: 'Pajak STNK & Kendaraan Bermotor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Servis Berkala & Ganti Ban Kendaraan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Buffer Darurat Kas Likuid' })).toBeInTheDocument();
  });

  it('filters funds by priority tier tabs', () => {
    render(<SinkingFundsHub />);

    // Initially "Semua" is active
    expect(screen.getByRole('heading', { name: 'Pajak STNK & Kendaraan Bermotor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Buffer Darurat Kas Likuid' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upgrade Homelab & Workstation Gear' })).toBeInTheDocument();

    // Click "Tier 1: Wajib" tab
    const tier1Tab = screen.getByRole('button', { name: /Tier 1: Wajib/i });
    fireEvent.click(tier1Tab);

    // Tier 1 card heading should be present
    expect(screen.getByRole('heading', { name: 'Pajak STNK & Kendaraan Bermotor' })).toBeInTheDocument();
    // Tier 2 & Tier 3 card headings should NOT be present in the filtered cards
    expect(screen.queryByRole('heading', { name: 'Buffer Darurat Kas Likuid' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Upgrade Homelab & Workstation Gear' })).not.toBeInTheDocument();

    // Click "Tier 3: Gaya Hidup" tab
    const tier3Tab = screen.getByRole('button', { name: /Tier 3: Gaya Hidup/i });
    fireEvent.click(tier3Tab);
    expect(screen.getByRole('heading', { name: 'Upgrade Homelab & Workstation Gear' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pajak STNK & Kendaraan Bermotor' })).not.toBeInTheDocument();
  });

  it('renders waterfall simulator and updates on preset click', () => {
    render(<SinkingFundsHub />);

    expect(screen.getByText('Simulator Waterfall Alokasi Surplus')).toBeInTheDocument();
    expect(screen.getByText('Total Teralokasikan')).toBeInTheDocument();

    // Find and click preset button (e.g. Rp 5.000.000)
    const presetBtn = screen.getByRole('button', { name: /5\.000\.000/i });
    fireEvent.click(presetBtn);

    // Input should reflect 5000000
    const sliderInput = screen.getByLabelText(/Nominal Surplus/i);
    expect(sliderInput).toHaveValue(5000000);
  });

  it('opens quick deposit modal when clicking Setor Tabungan', async () => {
    render(<SinkingFundsHub />);

    const depositBtns = screen.getAllByRole('button', { name: /Setor Tabungan/i });
    expect(depositBtns.length).toBeGreaterThan(0);

    fireEvent.click(depositBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Setor Tabungan:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Konfirmasi Setor/i })).toBeInTheDocument();
    });
  });

  describe('Reset Awal', () => {
    it('resets to default funds and clears localStorage when confirmed', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([CUSTOM_FUND]));
      confirmMock.mockResolvedValue(true);
      render(<SinkingFundsHub />);

      expect(screen.getByRole('heading', { name: CUSTOM_FUND.name })).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Pajak STNK & Kendaraan Bermotor' })
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Reset Awal/i }));

      await waitFor(() => {
        expect(toastSuccess).toHaveBeenCalledWith('Daftar pos dana berhasil direset ke data awal');
      });
      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Reset Pos Dana', variant: 'destructive' })
      );
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(screen.queryByRole('heading', { name: CUSTOM_FUND.name })).not.toBeInTheDocument();
      for (const fund of DEFAULT_SINKING_FUNDS) {
        expect(screen.getByRole('heading', { name: fund.name })).toBeInTheDocument();
      }
    });

    it('keeps current funds and storage when cancelled', async () => {
      const stored = JSON.stringify([CUSTOM_FUND]);
      localStorage.setItem(STORAGE_KEY, stored);
      confirmMock.mockResolvedValue(false);
      render(<SinkingFundsHub />);

      fireEvent.click(screen.getByRole('button', { name: /Reset Awal/i }));

      await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
      expect(toastSuccess).not.toHaveBeenCalled();
      expect(localStorage.getItem(STORAGE_KEY)).toBe(stored);
      expect(screen.getByRole('heading', { name: CUSTOM_FUND.name })).toBeInTheDocument();
    });
  });

  it('deletes a fund via useConfirm with destructive variant', async () => {
    confirmMock.mockResolvedValue(true);
    render(<SinkingFundsHub />);

    const target = DEFAULT_SINKING_FUNDS[0];
    fireEvent.click(screen.getAllByRole('button', { name: 'Hapus pos' })[0]);

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(`Pos dana "${target.name}" dihapus`);
    });
    expect(confirmMock).toHaveBeenCalledWith({
      title: 'Hapus Pos Dana',
      description: `Hapus pos dana "${target.name}"?`,
      confirmLabel: 'Hapus',
      variant: 'destructive',
    });
    expect(screen.queryByRole('heading', { name: target.name })).not.toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SinkingFund[];
    expect(saved.some((f) => f.id === target.id)).toBe(false);
  });

  it('applies waterfall allocation to fund balances when confirmed', async () => {
    confirmMock.mockResolvedValue(true);
    render(<SinkingFundsHub />);

    fireEvent.click(screen.getByRole('button', { name: /Terapkan Alokasi/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SinkingFund[];
    const totalBefore = DEFAULT_SINKING_FUNDS.reduce((sum, f) => sum + f.currentAmount, 0);
    const totalAfter = saved.reduce((sum, f) => sum + f.currentAmount, 0);
    expect(saved).toHaveLength(DEFAULT_SINKING_FUNDS.length);
    expect(totalAfter).toBeGreaterThan(totalBefore);
    expect(totalAfter - totalBefore).toBeLessThanOrEqual(3000000);
  });
});
