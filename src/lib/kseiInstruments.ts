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

// ─── field-alias tables (single source: extractor + KUR-148 shape harness) ──

/** Ticker/fund-code candidates per slice type (tried in order, case-insensitive). */
export const CODE_KEYS_BY_SLICE: Record<KseiSliceType, string[]> = {
  EKUITAS: ['code', 'codeBaseSec', 'ticker', 'symbol', 'emitenCode', 'secCode'],
  REKSADANA: ['code', 'codeBaseSec', 'fundCode', 'schemeCode', 'ticker', 'symbol'],
};
export const NAME_KEYS = [
  'name', 'nama', 'fundName', 'emitenName', 'emitenshortname',
  'shortName', 'longName', 'description',
];
export const VALUE_KEYS = [
  'summaryAmount', 'summaryValue', 'value', 'amount', 'nav',
  'balanceRupiah', 'marketValue', 'totalValue',
];
export const VOLUME_KEYS = ['jmlLembar', 'volume', 'quantity', 'qty', 'lembar', 'units'];

// ─── field-alias reading ────────────────────────────────────────────────────

/** Result of an alias lookup: which alias matched and the ORIGINAL key it hit. */
export interface AliasPick {
  /** alias that matched ('' when MISS) */
  alias: string;
  /** original as-written row key that satisfied the alias (null when MISS) */
  key: string | null;
  value?: string | number;
}

/** pickString + which alias/original key matched (KUR-148 shape harness). */
export function tracePickString(obj: Record<string, unknown>, keys: string[]): AliasPick {
  for (const alias of keys) {
    let origKey: string | null = null;
    let v: unknown;
    for (const [k, val] of Object.entries(obj)) {
      if (k.toLowerCase() === alias.toLowerCase()) {
        origKey = k;
        v = val; // last duplicate wins — mirrors the lowerKeys map build order
      }
    }
    if (origKey === null) continue;
    if (typeof v === 'string' && v.trim()) return { alias, key: origKey, value: v.trim() };
    if (typeof v === 'number' && Number.isFinite(v)) return { alias, key: origKey, value: String(v) };
  }
  return { alias: '', key: null };
}

/** pickNumber + which alias/original key matched (KUR-148 shape harness). */
export function tracePickNumber(obj: Record<string, unknown>, keys: string[]): AliasPick {
  for (const alias of keys) {
    let origKey: string | null = null;
    let v: unknown;
    for (const [k, val] of Object.entries(obj)) {
      if (k.toLowerCase() === alias.toLowerCase()) {
        origKey = k;
        v = val;
      }
    }
    if (origKey === null) continue;
    if (typeof v === 'number' && Number.isFinite(v)) return { alias, key: origKey, value: v };
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
      return { alias, key: origKey, value: Number(v) };
    }
  }
  return { alias: '', key: null };
}

/** First present, non-empty string among candidate keys (case-insensitive). */
function pickString(obj: Record<string, unknown>, keys: string[]): string {
  const picked = tracePickString(obj, keys);
  return picked.key === null ? '' : (picked.value as string);
}

/** First present, finite number among candidate keys (case-insensitive). */
function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  const picked = tracePickNumber(obj, keys);
  return picked.key === null ? undefined : (picked.value as number);
}

/**
 * Where findInstrumentList got the instrument rows and, when it fell back to
 * the recursive walk, the object path to the array (KUR-148 shape harness).
 * `wellKnownKey` is the matched WELL_KNOWN key, null when the fallback hit.
 */
export interface ContainerSource {
  wellKnownKey: string | null;
  fallbackPath: string | null;
}

/**
 * Find the instrument array inside an unknown payload. Strategy, in order:
 * 1. well-known container keys from the AKSes client bundle
 *    (dataListNodeEmitenList etc.) — first non-empty array wins;
 * 2. recursive walk: the FIRST array whose elements are objects that carry a
 *    recognizable value-ish field (amount/value/summaryValue/nav…) — protects
 *    against renamed containers without guessing a hard-coded path.
 *
 * `trace` (KUR-148 shape harness) receives where the container came from:
 * WELL_KNOWN key, or the fallback path (e.g. "$.response.dataList[0]"),
 * or {null, null} when nothing matched. Selection is identical with or
 * without trace — only the origin is reported.
 */
function findInstrumentList(
  raw: unknown,
  trace?: (src: ContainerSource) => void
): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    const rows = raw.filter(el => el !== null && typeof el === 'object') as Record<string, unknown>[];
    if (trace) trace({ wellKnownKey: null, fallbackPath: '$' });
    return rows;
  }
  if (raw === null || typeof raw !== 'object') {
    if (trace) trace({ wellKnownKey: null, fallbackPath: null });
    return [];
  }

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
      if (rows.length > 0) {
        if (trace) trace({ wellKnownKey: key, fallbackPath: null });
        return rows;
      }
    }
  }

  // Recursive fallback: depth-first, first array of value-bearing objects.
  const FALLBACK_VALUE_KEYS = [
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
          FALLBACK_VALUE_KEYS.some(k => k in lowerKeys(row))
        )
      ) {
        return node as Record<string, unknown>[]; // ORIGINAL array — path-findable
      }
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const found = visit(v);
      if (found) return found;
    }
    return null;
  };
  for (const [key, value] of Object.entries(obj)) {
    const found = visit(value);
    if (found) {
      if (trace) trace({ wellKnownKey: null, fallbackPath: pathToContainer(found, obj) });
      return found.filter(
        el => el !== null && typeof el === 'object' && !Array.isArray(el)
      ) as Record<string, unknown>[];
    }
  }
  if (trace) trace({ wellKnownKey: null, fallbackPath: null });
  return [];
}

/**
 * Re-derive the object path to `container` inside `root` by a fresh walk
 * (KUR-148 shape harness). Search order matches visit()'s depth-first pass,
 * so the reported path is the one the selection actually took.
 */
function pathToContainer(container: unknown, root: unknown): string {
  const stack: Array<{ node: unknown; path: string }> = [];
  const push = (node: unknown, path: string) => {
    if (node === null || typeof node !== 'object') return;
    if (stack.some(e => e.node === node)) return; // don't revisit shared refs
    stack.push({ node, path });
  };
  for (const [k, v] of Object.entries(root as Record<string, unknown>)) {
    push(v, `$.${k}`);
  }
  while (stack.length > 0) {
    const { node, path } = stack.pop() as { node: unknown; path: string };
    if (node === container) return path;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) push(node[i], `${path}[${i}]`);
    } else {
      const entries = Object.entries(node as Record<string, unknown>);
      for (let i = entries.length - 1; i >= 0; i--) {
        const [k, v] = entries[i];
        push(v, `${path}.${k}`);
      }
    }
  }
  return '(path tak terlacak — referensi tidak konvensional / siklik terpotong)';
}

function lowerKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k.toLowerCase()] = v;
  return out;
}

/** A row extractInstruments skipped, with the reason (KUR-148 shape harness). */
export interface DroppedRow {
  /** row position in the container (0-based) */
  index: number;
  /** 'no-value' when no value alias held a number, else 'no-identity' */
  reason: 'no-value' | 'no-identity';
  /** the raw row keys, as written in the payload */
  keys: string[];
}

/**
 * Trace of one extractInstruments run (KUR-148 shape harness) — selection is
 * identical with or without it; only observability is added.
 */
export interface ExtractTrace {
  container: ContainerSource;
  /** which alias/original key matched on the FIRST CONTAINER row (even if that row was dropped) */
  firstRowPicks: {
    code: AliasPick;
    name: AliasPick;
    value: AliasPick;
    volume: AliasPick;
  } | null;
  /** raw keys of the first container row, as written in the payload */
  firstRowKeys: string[];
  dropped: DroppedRow[];
}

/** Extract UI rows from a raw payload. Never throws; unknown → []. */
export function extractInstruments(
  raw: unknown,
  sliceType: 'EKUITAS' | 'REKSADANA',
  trace?: (t: ExtractTrace) => void
): KseiInstrument[] {
  const containerBox: { current: ContainerSource | null } = { current: null };
  const rows = findInstrumentList(raw, src => {
    containerBox.current = src;
  });
  const codeKeys = CODE_KEYS_BY_SLICE[sliceType];

  let firstRowPicks: ExtractTrace['firstRowPicks'] = null;
  let firstRowKeys: string[] = [];
  const dropped: DroppedRow[] = [];
  const out: KseiInstrument[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isFirstRow = i === 0;
    if (isFirstRow) {
      // Row-0 alias picks are recorded EVEN WHEN the row is dropped — a MISS
      // on value must be reported with the keys that were actually available.
      firstRowKeys = Object.keys(row);
      firstRowPicks = {
        code: tracePickString(row, codeKeys),
        name: tracePickString(row, NAME_KEYS),
        value: tracePickNumber(row, VALUE_KEYS),
        volume: tracePickNumber(row, VOLUME_KEYS),
      };
    }

    const valuePick = tracePickNumber(row, VALUE_KEYS);
    if (valuePick.key === null) {
      // not an instrument row — skip silently (unchanged behavior)
      dropped.push({ index: i, reason: 'no-value', keys: Object.keys(row) });
      continue;
    }

    const name = pickString(row, NAME_KEYS);
    const code = pickString(row, codeKeys) || (name ? name.slice(0, 24) : '');
    if (!code && !name) {
      dropped.push({ index: i, reason: 'no-identity', keys: Object.keys(row) });
      continue;
    }

    const item: KseiInstrument = { code, name, value: valuePick.value as number };
    const volume = pickNumber(row, VOLUME_KEYS);
    if (sliceType === 'EKUITAS' && volume !== undefined && volume > 0) {
      item.volume = Math.round(volume);
    }
    out.push(item);
  }
  if (trace) {
    trace({
      container: containerBox.current ?? { wellKnownKey: null, fallbackPath: null },
      firstRowPicks,
      firstRowKeys: firstRowKeys.length > 0 ? firstRowKeys : (rows[0] ? Object.keys(rows[0]) : []),
      dropped,
    });
  }
  return out;
}
