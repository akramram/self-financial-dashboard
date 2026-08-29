/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { notifyDataChanged, onDataChanged } from '../lib/dataSync';

describe('dataSync event bus', () => {
  it('notifyDataChanged fires listener with scope detail', () => {
    const cb = vi.fn();
    const off = onDataChanged(cb);
    notifyDataChanged('transactions');
    expect(cb).toHaveBeenCalledTimes(1);
    off();
  });

  it('unsubscribe stops delivery', () => {
    const cb = vi.fn();
    const off = onDataChanged(cb);
    off();
    notifyDataChanged('transactions');
    expect(cb).not.toHaveBeenCalled();
  });

  it('carries scope in event detail', () => {
    let scope = '';
    const off = onDataChanged(() => {});
    window.addEventListener('fin-data-changed', ((e: CustomEvent) => { scope = e.detail.scope; }) as EventListener);
    notifyDataChanged('networth');
    expect(scope).toBe('networth');
    off();
  });
});
