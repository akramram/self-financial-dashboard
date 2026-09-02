import { describe, it, expect } from 'vitest';
import { periodForDate } from '../lib/utils';

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
