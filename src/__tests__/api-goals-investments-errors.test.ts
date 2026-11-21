import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateGoalApi, deleteGoalApi, updateInvestmentApi, deleteInvestmentApi } from '../lib/api';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('goal / investment update+delete helpers surface server errors', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('resolve on 2xx', async () => {
    fetchMock.mockResolvedValue(json(200, { success: true }));
    await expect(updateGoalApi(1, { name: 'Dana Darurat' })).resolves.toBeUndefined();
    await expect(deleteInvestmentApi(2)).resolves.toBeUndefined();
  });

  it('reject with server message on 4xx/5xx (used to resolve silently)', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { error: 'Goal not found' }));
    await expect(updateGoalApi(99, { current_amount: 1 })).rejects.toThrow('Update goal gagal (404): Goal not found');
    fetchMock.mockResolvedValueOnce(json(500, { error: 'db locked' }));
    await expect(deleteGoalApi(1)).rejects.toThrow('Hapus goal gagal (500): db locked');
    fetchMock.mockResolvedValueOnce(json(400, { error: 'Invalid quantity' }));
    await expect(updateInvestmentApi(3, {})).rejects.toThrow('Invalid quantity');
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 502 }));
    await expect(deleteInvestmentApi(3)).rejects.toThrow('Hapus investasi gagal (502)');
  });
});
