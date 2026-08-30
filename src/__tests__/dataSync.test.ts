/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notifyDataChanged, onDataChanged } from '../lib/dataSync';
import './fakeBroadcastChannel';
import { FakeChannel } from './fakeBroadcastChannel';

describe('dataSync event bus (same-tab)', () => {
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

describe('dataSync cross-tab (BroadcastChannel relay)', () => {
  beforeEach(() => {
    FakeChannel.instances = [];
    (globalThis as any).BroadcastChannel = FakeChannel;
    vi.resetModules();
  });
  afterEach(() => {
    delete (globalThis as any).BroadcastChannel;
    vi.resetModules();
  });

  it('notify in tab A fires listener in tab B (separate module instance = separate page)', async () => {
    const tabA = await import('../lib/dataSync');
    const tabB = await import('../lib/dataSync');
    const cbB = vi.fn();
    const offB = tabB.onDataChanged(cbB);
    tabA.notifyDataChanged('transactions');
    expect(cbB).toHaveBeenCalledTimes(1);
    offB();
  });

  it('same-tab listener fires exactly once per notify (no echo loop)', async () => {
    const tabA = await import('../lib/dataSync');
    const cb = vi.fn();
    const off = tabA.onDataChanged(cb);
    tabA.notifyDataChanged('networth');
    expect(cb).toHaveBeenCalledTimes(1);
    off();
  });

  it('falls back silently when BroadcastChannel is unavailable', async () => {
    delete (globalThis as any).BroadcastChannel;
    const tab = await import('../lib/dataSync');
    const cb = vi.fn();
    const off = tab.onDataChanged(cb);
    expect(() => tab.notifyDataChanged('transactions')).not.toThrow();
    expect(cb).toHaveBeenCalledTimes(1);
    off();
  });

  it('relayed event carries scope in detail', async () => {
    const tabA = await import('../lib/dataSync');
    const tabB = await import('../lib/dataSync');
    let scope = '';
    window.addEventListener('fin-data-changed', ((e: CustomEvent) => { scope = e.detail.scope; }) as EventListener);
    const offB = tabB.onDataChanged(() => {});
    tabA.notifyDataChanged('networth');
    expect(scope).toBe('networth');
    offB();
  });
});
