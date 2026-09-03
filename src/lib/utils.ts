import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIdr(n: number | undefined | null): string {
  if (n == null) return 'IDR 0';
  return 'IDR ' + Math.round(n).toLocaleString('id-ID');
}

export function formatNumber(n: number | undefined | null): string {
  if (n == null) return '0';
  return Math.round(n).toLocaleString('id-ID');
}

/**
 * Parse quick amount syntax used in Quick Add: "25rb", "1,5jt", "30k", "2.5m",
 * "1.500.000", "25000". Returns the rupiah value, or null when unparseable.
 * ponytail: no parentheses/negative math — expenses are always positive here.
 */
export function parseQuickAmount(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return null;
  const m = s.match(/^([\d.,]+)(jt|juta|m|rb|ribu|k)?$/);
  if (!m) return null;
  const numPart = m[1];
  const suffix = m[2];
  let n: number;
  if (suffix) {
    // With a suffix, '.'/',' act as decimal separators: "1,5jt" / "1.5m"
    n = Number(numPart.replace(/,/g, '.'));
  } else if (/^\d{1,3}(\.\d{3})+$/.test(numPart)) {
    // Indonesian thousands grouping without suffix: "1.500.000"
    n = Number(numPart.replace(/\./g, ''));
  } else {
    // Plain number; allow comma as decimal ("12,5" → 12.5)
    n = Number(numPart.replace(/,/g, '.'));
  }
  if (!Number.isFinite(n) || n <= 0) return null;
  switch (suffix) {
    case 'jt': case 'juta': case 'm': return Math.round(n * 1_000_000);
    case 'rb': case 'ribu': case 'k': return Math.round(n * 1_000);
    default: return Math.round(n);
  }
}

/**
 * Returns the current active billing period based on the 21st-of-month kickoff rule.
 * Each period runs from the 21st of a month to the 20th of the next month.
 * The period is named after the month it ends in (the 20th).
 * If today is >= 21 → next calendar month.
 * If today is < 21  → current calendar month.
 *
 * Returns the month string for use with getPeriodByMonth() on the server,
 * or for display purposes on the client.
 */
export function getActivePeriod(): { month: string; year: number } {
  const now = new Date();
  const day = now.getDate();
  if (day >= 21) {
    // New period started today — it ends next month
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
      month: next.toLocaleDateString('en-US', { month: 'long' }),
      year: next.getFullYear(),
    };
  }
  return {
    month: now.toLocaleDateString('en-US', { month: 'long' }),
    year: now.getFullYear(),
  };
}

/**
 * Formats the active period as "Month Year" string (e.g., "June 2026").
 * Client-side compatible (no DB call).
 */
export function getActivePeriodMonth(): string {
  const { month, year } = getActivePeriod();
  return `${month} ${year}`;
}

/**
 * Salary period that contains an arbitrary YYYY-MM-DD date.
 * Same 21st→20th convention as getActivePeriod(), but for a given day
 * instead of today. Returns null for unparseable input.
 * Used by Quick Add to place a transaction on a specific calendar day.
 */
export function periodForDate(dateStr: string): { month: string; year: number } | null {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  const day = d.getDate();
  if (day >= 21) {
    // Second half of the period → period is named after next month
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      month: next.toLocaleDateString('en-US', { month: 'long' }),
      year: next.getFullYear(),
    };
  }
  return {
    month: d.toLocaleDateString('en-US', { month: 'long' }),
    year: d.getFullYear(),
  };
}

export function getMonthSortKey(monthName: string): number {
  const monthMap: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, oktober: 10,
    november: 11, december: 12, month: 1,
  };
  const parts = monthName.toLowerCase().split(' ');
  let year = 0;
  let monthNum = 0;
  for (const part of parts) {
    if (monthMap[part]) monthNum = monthMap[part];
    else if (/^\d+$/.test(part)) year = parseInt(part, 10);
  }
  return year * 100 + monthNum;
}
