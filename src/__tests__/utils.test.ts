import { describe, it, expect } from 'vitest';
import { periodForDate, parseQuickAmount } from '../lib/utils';

describe('periodForDate — salary period for arbitrary date', () => {
  it('day < 21 → period named after current month', () => {
    // Aug 5 2026 falls in the "August 2026" period (Jul 21 – Aug 20)
    expect(periodForDate('2026-08-05')).toEqual({ month: 'August', year: 2026 });
    // Aug 20 = last day of the August period
    expect(periodForDate('2026-08-20')).toEqual({ month: 'August', year: 2026 });
  });

  it('day >= 21 → period named after next month', () => {
    // Jul 21 2026 starts the "August 2026" period
    expect(periodForDate('2026-07-21')).toEqual({ month: 'August', year: 2026 });
    // Aug 31 falls in the "September 2026" period
    expect(periodForDate('2026-08-31')).toEqual({ month: 'September', year: 2026 });
  });

  it('handles year boundary (December 25 → January)', () => {
    expect(periodForDate('2026-12-25')).toEqual({ month: 'January', year: 2027 });
    // Dec 20 still belongs to the December 2026 period
    expect(periodForDate('2026-12-20')).toEqual({ month: 'December', year: 2026 });
  });

  it('agrees with getActivePeriod convention for all days of a month', () => {
    // Every day in Aug 2026: days 1-20 → August period, 21-31 → September period
    for (let day = 1; day <= 31; day++) {
      const dd = String(day).padStart(2, '0');
      const p = periodForDate(`2026-08-${dd}`)!;
      expect(p).not.toBeNull();
      if (day <= 20) expect(p.month).toBe('August');
      else expect(p.month).toBe('September');
    }
  });

  it('returns null for unparseable input', () => {
    expect(periodForDate('not-a-date')).toBeNull();
    expect(periodForDate('')).toBeNull();
  });
});

describe('parseQuickAmount — quick amount syntax', () => {
  it('parses Indonesian suffixes', () => {
    expect(parseQuickAmount('25rb')).toBe(25000);
    expect(parseQuickAmount('5 ribu')).toBe(5000);
    expect(parseQuickAmount('1,5jt')).toBe(1500000);
    expect(parseQuickAmount('2JT')).toBe(2000000);
  });

  it('parses international suffixes', () => {
    expect(parseQuickAmount('30k')).toBe(30000);
    expect(parseQuickAmount('2.5m')).toBe(2500000);
    expect(parseQuickAmount('750K')).toBe(750000);
  });

  it('parses plain numbers and thousands grouping', () => {
    expect(parseQuickAmount('25000')).toBe(25000);
    expect(parseQuickAmount('1.500.000')).toBe(1500000);
    expect(parseQuickAmount(' 100 ')).toBe(100);
  });

  it('returns null for invalid input', () => {
    expect(parseQuickAmount('')).toBeNull();
    expect(parseQuickAmount('abc')).toBeNull();
    expect(parseQuickAmount('0')).toBeNull();
    expect(parseQuickAmount('1.2.3')).toBeNull();
    expect(parseQuickAmount('25rbx')).toBeNull();
  });
});
