/**
 * KSEI drill-down instrument extraction (KUR-145, parent KUR-42).
 *
 * The raw AKSes 200 shape for equity-summary / reksadana-summary is still
 * UNVERIFIED (bearer token expired; field names in the KUR-42 comments come
 * from the minified SPA bundle — see Insight Scout spike). KUR-143's capture
 * flow stores those responses VERBATIM into `ksei_detail_snapshots.payload_json`.
 *
 * This module is the ONLY place that turns that raw payload into UI rows, so
 * when fixtures confirm the real shape, the mapping is adjusted here and
 * nowhere else (spec KUR-144 §8: "sesuaikan pemetaan, kolom UI tidak berubah").
 * The extractor is deliberately shape-tolerant: it walks the JSON for the
 * list container, reads fields by known AKSes naming plus pragmatic aliases,
 * and maps unknown shapes to an empty list (defensive empty state) instead of
 * throwing.
 */

export interface KseiInstrument {
  code: string;
  name: string;
  value: number;
  /** Shares — EKUITAS only when the payload carries it. */
  volume?: number;
}

/** Breakdown slice type the drill-down supports (spec KUR-144 §4: only these two are interactive). */
export type KseiSliceType = 'EKUITAS' | 'REKSADANA';

/** Slice type (breakdown) → ksei_detail_snapshots.kind (KUR-143 capture naming). */
export const KIND_BY_SLICE: Record<KseiSliceType, string> = {
  EKUITAS: 'equity-summary',
  REKSADANA: 'reksadana-summary',
};

// ─── shared card/sheet display constants (KUR-145) ──────────────────────────

export const KSEI_TYPE_COLORS: Record<string, string> = {
  EKUITAS: '#10b981',
  REKSADANA: '#6366f1',
  KAS: '#f59e0b',
  OBLIGASI: '#06b6d4',
  LAINNYA: '#94a3b8',
};

export function kseiTypeColor(type: string): string {
  return KSEI_TYPE_COLORS[type] ?? '#94a3b8';
}

export function kseiTypeLabel(type: string): string {
  const map: Record<string, string> = {
    EKUITAS: 'Saham',
    REKSADANA: 'Reksadana',
    KAS: 'Kas',
    OBLIGASI: 'Obligasi',
    LAINNYA: 'Lainnya',
  };
  return map[type] ?? type;
}

// ─── field-alias reading ────────────────────────────────────────────────────

/** First present, non-empty string among candidate keys (case-insensitive). */
function pickString(obj: Record<string, unknown>, keys: string[]): string {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) lower[k.toLowerCase()] = v;
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
}

/** First present, finite number among candidate keys (case-insensitive). */
function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) lower[k.toLowerCase()] = v;
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

/**
 * Find the instrument array inside an unknown payload. Strategy, in order:
 * 1. well-known container keys from the AKSes client bundle
 *    (dataListNodeEmitenList etc.) — first non-empty array wins;
 * 2. recursive walk: the FIRST array whose elements are objects that carry a
 *    recognizable value-ish field (amount/value/summaryValue/nav…) — protects
 *    against renamed containers without guessing a hard-coded path.
 */
function findInstrumentList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter(el => el !== null && typeof el === 'object') as Record<string, unknown>[];
  }
  if (raw === null || typeof raw !== 'object') return [];

  const WELL_KNOWN = [
    'dataListNodeEmitenList',
    'dataListEmiten',
    'emitenList',
    'dataList',
    'list',
    'data',
    'items',
    'result',
  ];
  const obj = raw as Record<string, unknown>;
  for (const key of WELL_KNOWN) {
    const candidate = obj[key];
    if (Array.isArray(candidate) && candidate.length > 0) {
      const rows = candidate.filter(
        el => el !== null && typeof el === 'object'
      ) as Record<string, unknown>[];
      if (rows.length > 0) return rows;
    }
  }

  // Recursive fallback: depth-first, first array of value-bearing objects.
  const VALUE_KEYS = [
    'summaryamount', 'amount', 'value', 'nav', 'totalvalue', 'balancerupiah',
    'marketvalue', 'closingprice', 'price',
  ];
  const seen = new Set<unknown>();
  const visit = (node: unknown): Record<string, unknown>[] | null => {
    if (node === null || typeof node !== 'object' || seen.has(node)) return null;
    seen.add(node);
    if (Array.isArray(node)) {
      const rows = node.filter(
        el => el !== null && typeof el === 'object' && !Array.isArray(el)
      ) as Record<string, unknown>[];
      if (
        rows.length > 0 &&
        rows.some(row =>
          VALUE_KEYS.some(k => k in lowerKeys(row))
        )
      ) {
        return rows;
      }
    }
    for (const v of Object.values(node as Record<string, unknown>)) {
      const found = visit(v);
      if (found) return found;
    }
    return null;
  };
  return visit(raw) ?? [];
}

function lowerKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k.toLowerCase()] = v;
  return out;
}

/** Extract UI rows from a raw payload. Never throws; unknown → []. */
export function extractInstruments(
  raw: unknown,
  sliceType: 'EKUITAS' | 'REKSADANA'
): KseiInstrument[] {
  const rows = findInstrumentList(raw);
  const out: KseiInstrument[] = [];
  for (const row of rows) {
    // Funds have no ticker — derive code from the name when absent.
    const codeKeys =
      sliceType === 'EKUITAS'
        ? ['code', 'codeBaseSec', 'ticker', 'symbol', 'emitenCode', 'secCode']
        : ['code', 'codeBaseSec', 'fundCode', 'schemeCode', 'ticker', 'symbol'];
    const nameKeys = [
      'name', 'nama', 'fundName', 'emitenName', 'emitenshortname',
      'shortName', 'longName', 'description',
    ];
    const valueKeys = [
      'summaryAmount', 'summaryValue', 'value', 'amount', 'nav',
      'balanceRupiah', 'marketValue', 'totalValue',
    ];
    const volumeKeys = ['jmlLembar', 'volume', 'quantity', 'qty', 'lembar', 'units'];

    const value = pickNumber(row, valueKeys);
    if (value === undefined) continue; // not an instrument row — skip silently

    const name = pickString(row, nameKeys);
    const code = pickString(row, codeKeys) || (name ? name.slice(0, 24) : '');
    if (!code && !name) continue;

    const item: KseiInstrument = { code, name, value };
    const volume = pickNumber(row, volumeKeys);
    if (sliceType === 'EKUITAS' && volume !== undefined && volume > 0) {
      item.volume = Math.round(volume);
    }
    out.push(item);
  }
  return out;
}
