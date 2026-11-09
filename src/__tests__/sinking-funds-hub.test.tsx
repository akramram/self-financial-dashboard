/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import SinkingFundsHub from '../components/SinkingFundsHub';

describe('SinkingFundsHub Component', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
