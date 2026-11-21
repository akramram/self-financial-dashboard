import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTransactions } from '../lib/api';

describe('fetchTransactions query params', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ json: () => Promise.resolve([]) });
    vi.stubGlobal('fetch', fetchMock);
  });

  const calledUrl = () => new URL(fetchMock.mock.calls[0][0], 'http://x');

  it('forwards month (regression: /analytics drill-down showed all-time rows)', async () => {
    await fetchTransactions({ month: 'November 2026', category: 'Makan' });
    const url = calledUrl();
    expect(url.searchParams.get('month')).toBe('November 2026');
    expect(url.searchParams.get('category')).toBe('Makan');
  });

  it('prefers period_id over month when both are given', async () => {
    await fetchTransactions({ periodId: 45, month: 'November 2026' });
    const url = calledUrl();
    expect(url.searchParams.get('period_id')).toBe('45');
    expect(url.searchParams.has('month')).toBe(false);
  });
});
