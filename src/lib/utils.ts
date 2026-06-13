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
