/**
 * Shared display formatters (KUR-145) — single source used by KseiCard and
 * KseiDrilldownSheet. Implementations are identical to the originals that
 * lived inline in KseiCard.tsx; extracted so card + sheet cannot drift.
 */

/** Full rupiah, rounded to whole rupiah, id-ID grouping — no jt/M abbreviation. */
export const fmtIdr = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

/** Percent with 1 decimal, comma decimal separator (id-ID display pattern). */
export const fmtPercent1 = (n: number) => n.toFixed(1).replace('.', ',');

/** ISO date (YYYY-MM-DD) → "30 Sep 2026" style id-ID label; passthrough on parse miss. */
export function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
