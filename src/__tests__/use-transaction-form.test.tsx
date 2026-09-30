/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

import {
  useTransactionForm,
  todayLocal,
  nowLocal,
  localToIso,
} from '../hooks/useTransactionForm';

const fetchMock = vi.fn();

/** fetch calls the form itself made (exclude useCategorySuggestion's debounced suggest-category) */
const txCalls = () => fetchMock.mock.calls.filter((c) => String(c[0]).includes('/api/transactions'));

function jsonResponse(status: number, body: Record<string, unknown> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('useTransactionForm', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes date/time to now and reports isJustNow', () => {
    const { result } = renderHook(() => useTransactionForm());
    expect(result.current.txDate).toBe(todayLocal());
    expect(result.current.txTime).toBe(nowLocal());
    expect(result.current.isJustNow).toBe(true);
  });

  it('flips isJustNow off when the user changes date or time', () => {
    const { result } = renderHook(() => useTransactionForm());
    act(() => result.current.handleDateChange('2026-09-01'));
    expect(result.current.isJustNow).toBe(false);
  });

  it('parses quick amounts (1.5jt / 25k) and exposes a preview', () => {
    const { result } = renderHook(() => useTransactionForm());
    act(() => result.current.setAmount('1.5jt'));
    expect(result.current.parsedAmount).toBe(1_500_000);
    act(() => result.current.setAmount('25k'));
    expect(result.current.parsedAmount).toBe(25_000);
    act(() => result.current.setAmount('abc'));
    expect(result.current.parsedAmount).toBeNull();
  });

  it('snaps the period (21st→20th convention) when the date changes', () => {
    const { result } = renderHook(() => useTransactionForm());
    act(() => result.current.handleDateChange('2026-09-25'));
    // day ≥ 21 belongs to the NEXT month's period (October 2026)
    expect(result.current.month).toBe('October');
    expect(result.current.year).toBe(2026);
  });

  it('submits successfully, notifies data change, and calls onSaved', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useTransactionForm({ onSaved }));
    act(() => {
      result.current.setTitle('Kopi');
      result.current.setAmount('25000');
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 1 }));
    await act(async () => {
      await result.current.submitTransaction();
    });
    expect(result.current.status).toBe('success');
    expect(onSaved).toHaveBeenCalledWith({ title: 'Kopi', amount: 25000, forced: false });
    const [, init] = txCalls()[0];
    const payload = JSON.parse(init.body);
    expect(payload.title).toBe('Kopi');
    expect(payload.amount).toBe(25000);
    expect(payload.created_time).toBe(localToIso(todayLocal(), nowLocal()));
    expect(payload.force).toBeUndefined();
  });

  it('blocks submit when title/amount missing and shows inline error', async () => {
    const { result } = renderHook(() => useTransactionForm());
    await act(async () => {
      await result.current.submitTransaction();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.errorMsg).toContain('wajib');
    expect(txCalls()).toHaveLength(0); // validation failed → no transaction POST
  });

  it('opens the duplicate dialog on 409, then force-adds via confirmDuplicate', async () => {
    const { result } = renderHook(() => useTransactionForm());
    act(() => {
      result.current.setTitle('Kopi');
      result.current.setAmount('25000');
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: 'duplicate' }));
    await act(async () => {
      await result.current.submitTransaction();
    });
    expect(result.current.status).toBe('duplicate');
    expect(result.current.showDuplicateDialog).toBe(true);

    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 2 }));
    await act(async () => {
      await result.current.confirmDuplicate();
    });
    expect(result.current.showDuplicateDialog).toBe(false);
    expect(result.current.status).toBe('success');
    const [, init] = txCalls()[1];
    expect(JSON.parse(init.body).force).toBe(true);
  });

  it('resetContent clears fields and status', async () => {
    const { result } = renderHook(() => useTransactionForm());
    act(() => {
      result.current.setTitle('X');
      result.current.setAmount('1000');
    });
    await act(async () => {
      await result.current.submitTransaction(); // missing? no — valid, but mock 500
    });
    // (500 path sets error status)
    act(() => result.current.resetContent());
    expect(result.current.title).toBe('');
    expect(result.current.amount).toBe('');
    expect(result.current.status).toBe('idle');
    expect(result.current.isJustNow).toBe(true);
  });

  it('surfaces API error messages inline', async () => {
    const { result } = renderHook(() => useTransactionForm());
    act(() => {
      result.current.setTitle('X');
      result.current.setAmount('1000');
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: 'Amount invalid' }));
    await act(async () => {
      await result.current.submitTransaction();
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMsg).toBe('Amount invalid');
  });
});
