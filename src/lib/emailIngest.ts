/**
 * Parser for Jenius card-notification emails.
 *
 * Two subjects are handled:
 *   "Notifikasi Transaksi Kartu Kredit Jenius"      → kind 'cc'
 *   "Notifikasi Transaksi QRIS Kartu Kredit Jenius" → kind 'qris'
 *
 * Fields the user cares about (confirmed from a real email):
 *   Tanggal & waktu transaksi: 26/11/2026 20:31:12
 *   Total Transaksi: RP 56.000,00
 *
 * Merchant / card tail are NOT confirmed yet, so those regexes are a tolerant
 * ladder of the labels Jenius usually ships. When nothing matches, merchant
 * falls back to '' and the review modal opens with an empty name field for the
 * user to fill — never a guessed value.
 *
 * NOTE: monospace temp hatch comment — keep parse logic pure (no db, no fs) so
 * vitest can exercise it directly.
 */

export interface ParsedJeniusEmail {
  kind: 'cc' | 'qris';
  subject: string;
  tx_date: string; // YYYY-MM-DD
  tx_time: string; // HH:mm:ss
  amount: number;
  merchant: string;
  card_last4: string;
  raw_excerpt: string;
}

export const JENIUS_SENDER = 'jenius_noreply@smbci.com';
const SUBJECT_MATCH = /notifikasi transaksi .*kartu kredit jenius/i;

function htmlToText(input: string): string {
  if (!/<[a-z!/][^>]*>/i.test(input)) return input;
  return input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|td|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ');
}

/** "Rp 56.000,00" / "IDR 1.234.567" / "56,000.00" / "125000" → 56000 / … */
export function parseIdrAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return NaN;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;

  if (lastComma >= 0 && lastDot >= 0) {
    // Both present: whichever comes LAST is the decimal separator.
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    normalized = cleaned.split(thousandSep).join('').replace(decimalSep, '.');
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.';
    const parts = cleaned.split(sep);
    // Single separator followed by 1-2 digits = decimal; otherwise thousands.
    normalized = parts.length === 2 && parts[1].length <= 2 ? parts.join('.') : parts.join('');
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value) : NaN;
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1] && m[1].trim()) return m[1].trim();
  }
  return '';
}

/**
 * Parse one email. Returns null when the message is not a Jenius card
 * notification, or when the mandatory date/amount pair cannot be read
 * (a notification we cannot price is worse than a skipped one).
 */
export function parseJeniusEmail(input: {
  subject?: string;
  body: string;
}): ParsedJeniusEmail | null {
  const subject = (input.subject || '').trim();
  if (subject && !SUBJECT_MATCH.test(subject)) return null;

  const text = htmlToText(input.body || '');

  const dateMatch = text.match(
    /Tanggal\s*(?:&|dan)?\s*waktu\s*transaksi\s*:?\s*(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i
  );
  const amountMatch = text.match(/Total\s*Transaksi\s*:?\s*(?:RP|IDR)\.?\s*([\d.,]+)/i);
  if (!dateMatch || !amountMatch) return null;

  const [, dd, mm, yyyy, hh, min, ss] = dateMatch;
  const amount = parseIdrAmount(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const merchant = firstMatch(text, [
    /Nama\s*Merchant\s*:?\s*(.+)/i,
    /Merchant\s*:?\s*(.+)/i,
    /Transaksi\s*di\s*:?\s*(.+)/i,
    /Nama\s*Toko\s*:?\s*(.+)/i,
    /Keterangan\s*:?\s*(.+)/i,
  ]);

  const cardLast4 =
    firstMatch(text, [
      /Kartu\s*Kredit[^\d\n]{0,40}(\d{4})(?!\d)/i,
      /[*x•]{2,}\s*(\d{4})(?!\d)/i,
      /(?:^|\s)(\d{4})(?:\s|$)/,
    ]) || '';

  const kind: ParsedJeniusEmail['kind'] = /qris/i.test(subject || text) ? 'qris' : 'cc';

  return {
    kind,
    subject,
    tx_date: `${yyyy}-${mm}-${dd}`,
    tx_time: `${hh.padStart(2, '0')}:${min}:${ss || '00'}`,
    amount,
    merchant: merchant.replace(/\s+/g, ' ').slice(0, 120),
    card_last4: cardLast4.slice(-4),
    raw_excerpt: text.trim().slice(0, 600),
  };
}