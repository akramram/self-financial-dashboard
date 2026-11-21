/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateTransactionApi,
  toggleTransactionDoneApi,
  deleteTransactionApi,
  deleteTransactionsBulkApi,
  updateTransactionsBulkApi,
} from '../lib/api';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('transaction mutation helpers reject on HTTP errors', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('resolve on success (bulk update still returns the body)', async () => {
    fetchMock.mockResolvedValue(json(200, { updated: 2 }));
    await expect(toggleTransactionDoneApi(1, true)).resolves.toBeUndefined();
    await expect(updateTransactionsBulkApi([1, 2], { done: true } as never)).resolves.toEqual({ updated: 2 });
  });

  it('reject with the server reason so callers revert optimistic UI', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { error: 'Not found' }));
    await expect(toggleTransactionDoneApi(9, true)).rejects.toThrow('Update status bayar gagal (404): Not found');
    fetchMock.mockResolvedValueOnce(json(400, { error: 'Invalid JSON body' }));
    await expect(updateTransactionApi(9, {})).rejects.toThrow('Update transaksi gagal (400)');
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    await expect(deleteTransactionApi(9)).rejects.toThrow('Hapus transaksi gagal (500)');
    fetchMock.mockResolvedValueOnce(json(400, { error: 'ids required' }));
    await expect(deleteTransactionsBulkApi([])).rejects.toThrow('ids required');
    fetchMock.mockResolvedValueOnce(json(500, { error: 'db locked' }));
    await expect(updateTransactionsBulkApi([1], {})).rejects.toThrow('db locked');
  });
});
