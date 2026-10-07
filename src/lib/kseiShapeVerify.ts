/**
 * KUR-148 — offline AKSes fixture shape verification engine.
 *
 * Runs the REAL `extractInstruments()` (src/lib/kseiInstruments.ts) over
 * verbatim fixture captures from scripts/ksei-capare-fixtures.sh (KUR-143)
 * WITHOUT any network access, and reports:
 *   1. which container path matched (WELL_KNOWN key or recursive fallback),
 *   2. which field aliases actually matched per field (code/name/value/volume)
 *      on the first container row — a MISS here is the broken-mapping signal,
 *   3. how many rows extractInstruments dropped (+ one example),
 *   4. extracted total vs the summary.json baseline (Rp 1 tolerance),
 *   5. an overall pass/fail usable as an exit code.
 *
 * This is a DIAGNOSIS harness only: alias adjustments happen in KUR-42 once
 * real fixtures exist — never here, never together with the extractor.
 */

import fs from 'node:fs';
import path from 'node:path';
import { extractInstruments, type ContainerSource, type AliasPick } from './kseiInstruments';
import { fmtIdr } from './format';

// ─── fixture discovery ──────────────────────────────────────────────────────

export interface FixtureFile {
  /** display kind: equity-summary | reksadana-summary | reksadana(<code>) */
  label: string;
  /** slice type handed to extractInstruments */
  sliceType: 'EKUITAS' | 'REKSADANA';
  /** file name inside the fixture dir */
  file: string;
}

/** Fixture files in verification order: slices first, then per-fund captures. */
export function listFixtureFiles(dir: string): FixtureFile[] {
  const names = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'meta.json' && f !== 'summary.json')
    .sort();
  const order = ['equity-summary.json', 'reksadana-summary.json'];
  const slices = order.filter(f => names.includes(f));
  const perFund = names.filter(
    f => f.startsWith('reksadana-') && !slices.includes(f)
  );
  return [...slices, ...perFund].map(f => {
    if (f === 'equity-summary.json') {
      return { label: 'equity-summary', sliceType: 'EKUITAS' as const, file: f };
    }
    if (f === 'reksadana-summary.json') {
      return { label: 'reksadana-summary', sliceType: 'REKSADANA' as const, file: f };
    }
    const code = f.replace(/^reksadana-/, '').replace(/\.json$/, '');
    return { label: `reksadana(${code})`, sliceType: 'REKSADANA' as const, file: f };
  });
}

/**
 * Latest fixture dir under the fixture root (a dir qualifies when it holds at
 * least one .json file). Returns null when the root is missing or empty —
 * fixtures are gitignored, so this is the normal pre-capture state.
 */
export function findLatestFixtureDir(root: string): string | null {
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(root);
  } catch {
    return null;
  }
  const dirs = entries
    .map(name => path.join(root, name))
    .filter(p => {
      try {
        return fs.statSync(p).isDirectory() && listFixtureFiles(p).length > 0;
      } catch {
        return false;
      }
    })
    .sort()
    .reverse();
  return dirs[0] ?? null;
}

// ─── verification ───────────────────────────────────────────────────────────

/** Reconciliation tolerance against the summary.json baseline (spec: Rp 1). */
export const RECONCILE_TOLERANCE_IDR = 1;

export interface FieldPickReport {
  field: 'code' | 'name' | 'value' | 'volume';
  /** matching alias ('' = MISS) */
  alias: string;
  /** original as-written row key that satisfied the alias (null on MISS) */
  key: string | null;
  miss: boolean;
}

export interface FixtureReport {
  label: string;
  sliceType: 'EKUITAS' | 'REKSADANA';
  file: string;
  /** null = parsed fine */
  parseError: string | null;
  container: {
    /** true when any container was located */
    found: boolean;
    /** matched WELL_KNOWN key, null when the recursive fallback hit */
    wellKnownKey: string | null;
    /** fallback object path (e.g. "$.response.dataList") or null */
    fallbackPath: string | null;
  };
  /** alias match per field on the first container row (empty when no rows) */
  fields: FieldPickReport[];
  /** raw keys of the first container row */
  firstRowKeys: string[];
  dropped: {
    count: number;
    exampleIndex: number | null;
    exampleReason: string | null;
    exampleKeys: string[];
  };
  extracted: {
    count: number;
    totalValue: number;
    totalFormatted: string;
  };
  /** null when summary.json is absent/unreadable or this is a per-fund fixture */
  reconcile: {
    baselineTotal: number | null;
    delta: number | null;
    deltaFormatted: string | null;
    /** null = not evaluated (no baseline); true when |delta| <= Rp 1 */
    ok: boolean | null;
    note: string;
  };
  /** >=1 instrument extracted AND reconciliation (when evaluated) passed */
  ok: boolean;
}

export interface SummaryBaseline {
  file: string;
  parseError: string | null;
  summaryValue: number | null;
  /** total per slice type (KSEI type keys, e.g. EKUITAS/REKSADANA), from summaryResponse */
  sliceTotals: Record<string, number>;
}

export interface VerifyReport {
  fixtureDir: string | null;
  baseline: SummaryBaseline | null;
  fixtures: FixtureReport[];
  pass: boolean;
  reason: string;
}

/** Read + validate summary.json as the reconciliation baseline. */
export function readSummaryBaseline(dir: string): SummaryBaseline | null {
  const file = path.join(dir, 'summary.json');
  if (!fs.existsSync(file)) return null;
  const noSlice = {} as Record<string, number>;
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return { file: 'summary.json', parseError: `baca gagal: ${String(err)}`, summaryValue: null, sliceTotals: noSlice };
  }
  if (raw.trim() === '') {
    return { file: 'summary.json', parseError: 'file kosong', summaryValue: null, sliceTotals: noSlice };
  }
  try {
    const json = JSON.parse(raw) as {
      summaryValue?: unknown;
      summaryResponse?: { type?: unknown; summaryAmount?: unknown }[];
    };
    const v = json?.summaryValue;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      return { file: 'summary.json', parseError: 'summaryValue bukan angka', summaryValue: null, sliceTotals: noSlice };
    }
    // Per-slice totals from the baseline breakdown (same keys the KseiCard
    // slices use, e.g. EKUITAS/REKSADANA). Missing/odd entries are skipped.
    const sliceTotals: Record<string, number> = {};
    if (Array.isArray(json.summaryResponse)) {
      for (const s of json.summaryResponse) {
        if (
          s &&
          typeof s.type === 'string' &&
          typeof s.summaryAmount === 'number' &&
          Number.isFinite(s.summaryAmount)
        ) {
          sliceTotals[s.type] = s.summaryAmount;
        }
      }
    }
    return { file: 'summary.json', parseError: null, summaryValue: v, sliceTotals };
  } catch (err) {
    return { file: 'summary.json', parseError: `JSON korup: ${String(err)}`, summaryValue: null, sliceTotals: noSlice };
  }
}

function pickReport(
  field: FieldPickReport['field'],
  pick: AliasPick
): FieldPickReport {
  return {
    field,
    alias: pick.key === null ? '' : pick.alias,
    key: pick.key,
    miss: pick.key === null,
  };
}

/** Run extractInstruments over one fixture file and describe what matched. */
export function verifyFixtureFile(dir: string, f: FixtureFile, baseline: SummaryBaseline | null): FixtureReport {
  const filePath = path.join(dir, f.file);
  let raw: unknown;
  let parseError: string | null = null;
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    if (text.trim() === '') {
      parseError = 'file kosong';
      raw = null;
    } else {
      raw = JSON.parse(text);
    }
  } catch (err) {
    parseError = `JSON korup: ${String(err)}`;
    raw = null;
  }

  const report: FixtureReport = {
    label: f.label,
    sliceType: f.sliceType,
    file: f.file,
    parseError,
    container: { found: false, wellKnownKey: null, fallbackPath: null },
    fields: [],
    firstRowKeys: [],
    dropped: { count: 0, exampleIndex: null, exampleReason: null, exampleKeys: [] },
    extracted: { count: 0, totalValue: 0, totalFormatted: fmtIdr(0) },
    reconcile: {
      baselineTotal: null,
      delta: null,
      deltaFormatted: null,
      ok: null,
      note: '',
    },
    ok: false,
  };

  if (parseError) {
    report.reconcile.note = 'fixture tidak ter-parse — tidak diverifikasi';
    return report;
  }

  let container: ContainerSource | null = null;
  const instruments = extractInstruments(raw, f.sliceType, t => {
    container = t.container;
  });
  const c = container as ContainerSource | null;

  report.container.found = c !== null && (c.wellKnownKey !== null || c.fallbackPath !== null);
  report.container.wellKnownKey = c?.wellKnownKey ?? null;
  report.container.fallbackPath = c?.fallbackPath ?? null;

  // Trace the FIRST CONTAINER row — even when it was dropped. A MISS on value
  // must name the keys that were actually available on that row.
  if (c) {
    const box: {
      picks: { code: AliasPick; name: AliasPick; value: AliasPick; volume: AliasPick } | null;
      keys: string[];
    } = { picks: null, keys: [] };
    extractInstruments(raw, f.sliceType, t => {
      box.picks = t.firstRowPicks;
      box.keys = t.firstRowKeys;
    });
    report.fields = box.picks
      ? [
          pickReport('code', box.picks.code),
          pickReport('name', box.picks.name),
          pickReport('value', box.picks.value),
          pickReport('volume', box.picks.volume),
        ]
      : [];
    report.firstRowKeys = box.keys;
  }

  // Drop stats come from a fresh trace pass (reasons per skipped row).
  const dropBox: { count: number; index: number | null; reason: string | null; keys: string[] } = {
    count: 0,
    index: null,
    reason: null,
    keys: [],
  };
  extractInstruments(raw, f.sliceType, t => {
    dropBox.count = t.dropped.length;
    if (t.dropped.length > 0) {
      dropBox.index = t.dropped[0].index;
      dropBox.reason = t.dropped[0].reason;
      dropBox.keys = t.dropped[0].keys;
    }
  });
  report.dropped = {
    count: dropBox.count,
    exampleIndex: dropBox.index,
    exampleReason: dropBox.reason,
    exampleKeys: dropBox.keys,
  };

  const total = instruments.reduce((sum, i) => sum + i.value, 0);
  report.extracted = { count: instruments.length, totalValue: total, totalFormatted: fmtIdr(total) };

  // Reconciliation vs the summary.json baseline: slice fixtures compare their
  // extracted total to the baseline's TOTAL FOR THAT SLICE (summaryResponse
  // entry keyed by slice type, e.g. EKUITAS/REKSADANA) — not the whole-
  // portfolio summaryValue. Per-fund fixtures have no slice baseline.
  const isSlice = f.file === 'equity-summary.json' || f.file === 'reksadana-summary.json';
  const baselineTotal =
    isSlice && baseline && baseline.sliceTotals[f.sliceType] !== undefined
      ? baseline.sliceTotals[f.sliceType]
      : null;
  if (isSlice && baselineTotal !== null) {
    const delta = total - baselineTotal;
    report.reconcile = {
      baselineTotal,
      delta,
      deltaFormatted: fmtIdr(delta),
      ok: Math.abs(delta) <= RECONCILE_TOLERANCE_IDR,
      note: '',
    };
  } else if (isSlice) {
    report.reconcile.note =
      baseline && baseline.parseError === null
        ? `baseline tidak punya slice ${f.sliceType} di summaryResponse — rekonsiliasi dilewati`
        : 'baseline summary.json tidak tersedia/terbaca — rekonsiliasi dilewati';
  } else {
    report.reconcile.note = 'fixture per-fund — rekonsiliasi vs slice baseline tidak berlaku';
  }

  report.ok = instruments.length >= 1 && report.reconcile.ok !== false;
  return report;
}

/**
 * Verify every fixture in a fixture dir. pass=false when no fixtures exist,
 * any fixture yields 0 instruments, any baseline reconciliation fails, or the
 * baseline exists but cannot be read.
 */
export function verifyFixtureDir(dir: string): VerifyReport {
  const baseline = readSummaryBaseline(dir);
  const files = listFixtureFiles(dir);
  const fixtures = files.map(f => verifyFixtureFile(dir, f, baseline));

  let pass = fixtures.length > 0;
  let reason = fixtures.length === 0 ? 'tidak ada fixture (*.json) di direktori' : '';

  if (baseline && baseline.parseError && baseline.summaryValue === null) {
    pass = false;
    reason = reason || `summary.json korup: ${baseline.parseError}`;
  }
  for (const fx of fixtures) {
    if (fx.parseError) {
      pass = false;
      reason = reason || `${fx.file}: ${fx.parseError}`;
    } else if (fx.extracted.count === 0) {
      pass = false;
      reason = reason || `${fx.file}: 0 instrumen ter-ekstrak`;
    } else if (fx.reconcile.ok === false) {
      pass = false;
      reason = reason || `${fx.file}: selisih vs baseline ${fx.reconcile.deltaFormatted}`;
    }
  }
  if (pass) reason = 'semua fixture lolos (>=1 instrumen, rekonsiliasi cocok bila baseline ada)';
  return { fixtureDir: dir, baseline, fixtures, pass, reason };
}
