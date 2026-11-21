/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

const fetchNetworth = vi.fn();
const updateNetworthApi = vi.fn();
vi.mock('../lib/api', () => ({
  fetchNetworth: (...a: unknown[]) => fetchNetworth(...a),
  updateNetworthApi: (...a: unknown[]) => updateNetworthApi(...a),
}));
vi.mock('../components/MilestoneCelebration', () => ({ default: () => null }));

import NetworthEditForm from '../components/NetworthEditForm';

const ROWS = [
  {
    period_id: 45,
    month: 'November 2026',
    date: '2026-10-21',
    total: 300,
    currency: 'IDR',
    month_over_month_change: null,
    month_over_month_pct: null,
    breakdown: { Saham: 100, Kas: 200 },
  },
];

function openFor(month: string) {
  window.history.pushState({}, '', `/networth/edit?month=${encodeURIComponent(month)}`);
  render(<NetworthEditForm />);
}

describe('NetworthEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchNetworth.mockResolvedValue(ROWS);
  });

  it('saves via period_id and keeps the row date (regression: sent month label + blank date → 400)', async () => {
    updateNetworthApi.mockResolvedValue({ success: true });
    openFor('November 2026');
    await screen.findByDisplayValue('Saham');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(updateNetworthApi).toHaveBeenCalledWith(
        45,
        expect.objectContaining({ month: 'November 2026', date: '2026-10-21', total: 300 }),
      ),
    );
    expect(await screen.findByText('Networth updated successfully!')).toBeInTheDocument();
  });

  it('shows the API error instead of a false success', async () => {
    updateNetworthApi.mockRejectedValue(new Error('Update networth gagal (400): Invalid period_id'));
    openFor('November 2026');
    await screen.findByDisplayValue('Saham');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid period_id');
    expect(screen.queryByText('Networth updated successfully!')).not.toBeInTheDocument();
  });

  it('disables saving when the month has no networth row', async () => {
    openFor('March 2031');
    expect(await screen.findByRole('alert')).toHaveTextContent('March 2031');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
  });
});
