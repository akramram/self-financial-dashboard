import {
  getCachedKseiSnapshot,
  getLatestKseiSnapshot,
  saveKseiSnapshot,
  type KseiSnapshotRow,
} from './db';
import { loadKseiToken } from './kseiToken';

/**
 * AKSes (KSEI) portfolio summary — live asset section (KUR-40, replaces the
 * BBRI one-stock card from KUR-29).
 *
 * Server-side only. Positions are end-of-day: "today" times out until the
 * custodian posts the daily file (observed 1 Okt 2026: today = timeout,
 * past dates = instant), so the fetch walks back day by day until it gets a
 * snapshot. Everything renders from the SQLite cache (`ksei_snapshots`,
 * additive table); the network refresh happens at most once per
 * MIN_REFRESH_INTERVAL and falls back to cache on failure.
 *
 * Token: AKSes Bearer JWT (exp ~1 month), injected at boot from the
 * gitignored data/ksei.json via PM2 as KSEI_BEARER_TOKEN. Rotate by
 * re-running scripts/rotate-ksei-token.sh — the card surfaces `tokenExpired`
 * so you know when.
 */

export interface KseiSlice {
  type: string;
  amount: number;
  percent: number;
}

export interface KseiPortfolio {
  snapshot_date: string;
  total_value: number;
  breakdown: KseiSlice[];
  fetched_at: string;
}

export interface KseiResult extends KseiPortfolio {
  /** true when served from cache older than the min refresh interval */
  stale: boolean;
  /** true when this response triggered a network refresh */
  refreshed: boolean;
  /** bearer token is missing or past its JWT exp — rotation needed */
  tokenExpired: boolean;
  /** non-fatal note (e.g. refresh fell back to cache) */
  error?: string;
}

// ─── shared request constants (detail fetch KUR-147 reuses these) ───────────

export const KSEI_BASE = 'https://akses.ksei.co.id';
export const KSEI_TIMEOUT_MS = 10_000;
/** walk back at most 10 days — covers long holidays; beyond that, fall back to cache */
const MAX_LOOKBACK_DAYS = 10;
export const MIN_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/** Headers for AKSes service calls — Authorization injected per request. */
export function kseiRequestHeaders(token: string): Record<string, string> {
  return {
    Accept: '*/*',
    Authorization: `Bearer ${token}`,
    Referer: `${KSEI_BASE}/myportofolio/saldo`,
    'User-Agent': 'Mozilla/5.0',
    DNT: '1',
  };
}

// ─── token handling (see lib/kseiToken.ts) ──────────────────────────────────

export { loadKseiToken, isTokenExpired } from './kseiToken';

// ─── WIB date helpers ───────────────────────────────────────────────────────

/** YYYY-MM-DD for "now" in WIB (UTC+7) — AKSes dates are Indonesia-focused. */
export function wibDateString(now = new Date()): string {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── fetch + parse ──────────────────────────────────────────────────────────

export interface SummaryApiResponse {
  summaryValue?: number;
  summaryResponse?: { type?: string; summaryAmount?: number; percent?: number }[];
}

/**
 * Fetch one EOD date. Resolves null when AKSes has no snapshot for that date
 * (today before posting, timeouts, 404s). Throws on hard failures so callers
 * can distinguish "no data yet" from "AKSes/token broken".
 */
export async function fetchKseiSummary(
  date: string,
  token: string,
  fetchImpl: typeof fetch = fetch
): Promise<SummaryApiResponse | null> {
  let res: Response;
  try {
    res = await fetchImpl(
      `${KSEI_BASE}/service/myportofolio/summary?type=&tanggal=${date}`,
      {
        headers: kseiRequestHeaders(token),
        signal: AbortSignal.timeout(KSEI_TIMEOUT_MS),
      }
    );
  } catch (err) {
    // Timeout / network error — AKSes hangs (not 404s) on dates with no file yet.
    if (err instanceof Error && err.name === 'TimeoutError') return null;
    throw err;
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = new Error(`AKSes HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  const json = (await res.json()) as SummaryApiResponse;
  if (!json || typeof json.summaryValue !== 'number' || !Array.isArray(json.summaryResponse)) {
    return null; // unexpected shape for this date → treat as "no snapshot yet"
  }
  return json;
}

export function normalizeSummary(
  json: SummaryApiResponse,
  snapshotDate: string,
  fetchedAt: string
): KseiPortfolio | null {
  if (typeof json.summaryValue !== 'number' || !Array.isArray(json.summaryResponse)) return null;
  const breakdown: KseiSlice[] = json.summaryResponse
    .filter(s => typeof s.type === 'string')
    .map(s => ({
      type: s.type as string,
      amount: Number(s.summaryAmount) || 0,
      percent: Number(s.percent) || 0,
    }));
  if (breakdown.length === 0) return null;
  return { snapshot_date: snapshotDate, total_value: json.summaryValue, breakdown, fetched_at: fetchedAt };
}

/**
 * Walk back from today (WIB) until AKSes returns a snapshot (max 10 days).
 * Throws the last hard error when every attempt fails.
 */
export async function fetchLatestKseiPortfolio(
  token: string,
  now = new Date(),
  fetchImpl: typeof fetch = fetch
): Promise<KseiPortfolio> {
  const todayWib = wibDateString(now);
  let lastErr: unknown = new Error('AKSes: no snapshot found in lookback window');
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const date = addDaysIso(todayWib, -i);
    let json: SummaryApiResponse | null = null;
    try {
      json = await fetchKseiSummary(date, token, fetchImpl);
    } catch (err) {
      lastErr = err;
      continue;
    }
    if (json) {
      const portfolio = normalizeSummary(json, date, now.toISOString());
      if (portfolio) return portfolio;
    }
  }
  throw lastErr;
}

// ─── cache-first read path ──────────────────────────────────────────────────

function rowToPortfolio(row: KseiSnapshotRow): KseiPortfolio {
  let breakdown: KseiSlice[] = [];
  try {
    breakdown = row.breakdown_json ? (JSON.parse(row.breakdown_json) as KseiSlice[]) : [];
  } catch {
    breakdown = [];
  }
  return {
    snapshot_date: row.snapshot_date,
    total_value: row.total_value,
    breakdown,
    fetched_at: row.fetched_at,
  };
}

/**
 * Cache-first read path (mirrors getBbriWithCache):
 * - Missing/expired token: no network — serve the latest cached snapshot
 *   (stale=true, tokenExpired=true) or throw when nothing is cached.
 * - Fresh cache (< maxAgeMs): return it, no network.
 * - Stale/missing cache: refresh via day walk-back and persist; on failure
 *   fall back to the latest cached snapshot marked stale (or throw when none).
 */
export async function getKseiWithCache(
  maxAgeMs: number = MIN_REFRESH_INTERVAL_MS,
  now = new Date()
): Promise<KseiResult> {
  const { token, expired } = loadKseiToken(now);
  const tokenExpired = expired || token === null;

  if (!token || expired) {
    const reason = expired
      ? 'Token AKSes kedaluwarsa — rotasi via scripts/rotate-ksei-token.sh'
      : 'Token AKSes belum diatur (data/ksei.json / KSEI_BEARER_TOKEN)';
    const latest = getLatestKseiSnapshot();
    if (latest) {
      return { ...rowToPortfolio(latest), stale: true, refreshed: false, tokenExpired, error: reason };
    }
    const err = new Error(reason);
    (err as any).tokenExpired = true;
    throw err;
  }

  const cached = getCachedKseiSnapshot(wibDateString(now));
  if (cached) {
    const age = now.getTime() - new Date(cached.fetched_at).getTime();
    if (age >= 0 && age < maxAgeMs) {
      return { ...rowToPortfolio(cached), stale: false, refreshed: false, tokenExpired };
    }
  }

  try {
    const fresh = await fetchLatestKseiPortfolio(token, now);
    saveKseiSnapshot(fresh);
    return { ...fresh, stale: false, refreshed: true, tokenExpired };
  } catch (err) {
    const latest = getLatestKseiSnapshot();
    if (latest) {
      return {
        ...rowToPortfolio(latest),
        stale: true,
        refreshed: false,
        tokenExpired,
        error: err instanceof Error ? err.message : 'AKSes fetch failed',
      };
    }
    throw err;
  }
}
