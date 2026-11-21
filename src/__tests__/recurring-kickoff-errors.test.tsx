/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  createRecurringTransaction,
  updateRecurringTransactionApi,
  deleteRecurringTransactionApi,
} from '../lib/api';
import MonthKickoffModal from '../components/MonthKickoffModal';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('recurring helpers surface server errors', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('create rejects on 400 validation with the server message', async () => {
    fetchMock.mockResolvedValue(json(400, { error: 'Amount must be a positive number' }));
    await expect(
      createRecurringTransaction({ title: 'Netflix', category: 'Hiburan', amount: -1 } as never),
    ).rejects.toThrow('Tambah recurring gagal (400): Amount must be a positive number');
  });

  it('update / delete reject on 404', async () => {
    fetchMock.mockResolvedValue(json(404, { error: 'Not found' }));
    await expect(updateRecurringTransactionApi(5, { active: false })).rejects.toThrow('Update recurring gagal (404)');
    await expect(deleteRecurringTransactionApi(5)).rejects.toThrow('Hapus recurring gagal (404)');
  });
});

describe('MonthKickoffModal', () => {
  it('shows the server reason when kickoff is rejected (409 already kicked off)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(409, { error: 'Month already kicked off (income record exists)' })));
    render(<MonthKickoffModal open onOpenChange={() => {}} nextMonth="December 2026" recurringCount={3} onSuccess={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('Enter your salary'), { target: { value: '15000000' } });
    fireEvent.click(screen.getByRole('button', { name: /start|kickoff|mulai/i }));
    expect(await screen.findByText('Month already kicked off (income record exists)')).toBeInTheDocument();
  });
});
