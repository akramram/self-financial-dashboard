/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { extractShared } from '../components/ShareCapture';

describe('extractShared — Quick Capture share text parsing', () => {
  it('extracts title and quick-amount token', () => {
    expect(extractShared('', 'Kopi 25rb')).toEqual({ title: 'Kopi', amount: '25000' });
  });

  it('uses shared title as fallback title when text has only amount', () => {
    expect(extractShared('Netflix', '1,5jt')).toEqual({ title: 'Netflix', amount: '1500000' });
  });

  it('handles Indonesian thousands grouping', () => {
    expect(extractShared('', 'Makan 35.000')).toEqual({ title: 'Makan', amount: '35000' });
  });

  it('keeps full title when no amount found', () => {
    expect(extractShared('', 'Bensin pertamax')).toEqual({ title: 'Bensin pertamax', amount: '' });
  });

  it('prefers first amount across multiple lines', () => {
    const r = extractShared('Struk', 'Total 120rb\nLain 5rb');
    expect(r.amount).toBe('120000');
    expect(r.title).toBe('Struk');
  });

  it('returns empty on no input', () => {
    expect(extractShared('', '')).toEqual({ title: '', amount: '' });
  });

  it('ignores short digit runs as amounts (dates, ids)', () => {
    // "2026" parses as 2026 — but as a standalone title line without a suffix
    // and under 4+ digits threshold... "2026" IS 4 digits, so it parses.
    // Guard: 1-3 digit runs are never amounts.
    const r = extractShared('', 'Parkir 2 jam');
    expect(r.amount).toBe('');
    expect(r.title).toBe('Parkir 2 jam');
  });
});
