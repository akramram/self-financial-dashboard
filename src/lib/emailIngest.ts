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
  const decoded = input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"');
  if (!/<[a-z!/][^>]*>/i.test(decoded)) return decoded;
  return decoded
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|td|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
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

const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', MEI: '05', JUN: '06',
  JUL: '07', AUG: '08', AGU: '08', SEP: '09', OCT: '10', OKT: '10', NOV: '11', DEC: '12', DES: '12',
};

/** Jenius ships two date shapes: "24/11/2026 21:16:41" and "25 NOV 2026 07:12:13 WIB". */
function parseTxDate(text: string): { date: string; time: string } | null {
  const numeric = text.match(
    /(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i
  );
  if (numeric) {
    const [, dd, mm, yyyy, hh, min, ss] = numeric;
    return {
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh.padStart(2, '0')}:${min}:${ss || '00'}`,
    };
  }

  const named = text.match(
    /(\d{1,2})\s+([A-Z]{3})[A-Za-z]*\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i
  );
  if (named) {
    const [, dd, mon, yyyy, hh, min, ss] = named;
    const mm = MONTHS[mon.toUpperCase()];
    if (!mm) return null;
    return {
      date: `${yyyy}-${mm}-${dd.padStart(2, '0')}`,
      time: `${hh.padStart(2, '0')}:${min}:${ss || '00'}`,
    };
  }
  return null;
}

/** "SHOPEE       622139500300 ID" → "SHOPEE"; "PENDI PECEL SUKSES   " → "PENDI PECEL SUKSES" */
function cleanMerchant(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\s+\d{8,}\s*ID\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
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

  const when = parseTxDate(text);
  const amountMatch = text.match(/Total\s*Transaksi\s*:?\s*(?:RP|IDR)\.?\s*([\d.,]+)/i);
  if (!when || !amountMatch) return null;

  const amount = parseIdrAmount(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const merchant = cleanMerchant(
    firstMatch(text, [
      /Nama\s*Merchant\s*:?\s*(.+)/i,
      /Merchant\s*:?\s*(.+)/i,
      /Transaksi\s*di\s*:?\s*(.+)/i,
      /Nama\s*Toko\s*:?\s*(.+)/i,
      /Keterangan\s*:?\s*(.+)/i,
    ])
  );

  // "No. Kartu: 437896******9514" → last4 only; the masked prefix is not ours to keep.
  const cardLast4 =
    firstMatch(text, [
      /No\.?\s*Kartu\s*:?[^\n]*?\*{4,}(\d{4})(?!\d)/i,
      /Kartu\s*Kredit\s*:?[^\n]*?\*{4,}(\d{4})(?!\d)/i,
      /\*{4,}\s*(\d{4})(?!\d)/,
    ]) || '';

  const kind: ParsedJeniusEmail['kind'] = /qris/i.test(subject || text) ? 'qris' : 'cc';

  return {
    kind,
    subject,
    tx_date: when.date,
    tx_time: when.time,
    amount,
    merchant,
    card_last4: cardLast4.slice(-4),
    raw_excerpt: text.trim().slice(0, 600),
  };
}