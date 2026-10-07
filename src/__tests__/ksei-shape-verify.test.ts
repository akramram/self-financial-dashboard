import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  findLatestFixtureDir,
  listFixtureFiles,
  readSummaryBaseline,
  verifyFixtureDir,
  verifyFixtureFile,
  RECONCILE_TOLERANCE_IDR,
  type FixtureFile,
} from '../lib/kseiShapeVerify';

/**
 * KUR-148 — offline shape harness. All shapes are SYNTHETIC: fixtures are
 * gitignored and currently zero, so the harness is validated against these
 * shapes instead (issue: well-known match, renamed container → fallback path,
 * unknown field names → explicit MISS, empty/corrupt fixture).
 *
 * Network: nothing here touches fetch — the engine only reads files.
 */

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ksei-shape-'));
}

function writeFixture(
  dir: string,
  name: string,
  body: string | object
): void {
  fs.mkdirSync(dir, { recursive: true });
  const content = typeof body === 'string' ? body : JSON.stringify(body);
  fs.writeFileSync(path.join(dir, name), content);
}

const EQUITY: FixtureFile = {
  label: 'equity-summary',
  sliceType: 'EKUITAS',
  file: 'equity-summary.json',
};

// ─── fixture discovery ──────────────────────────────────────────────────────

describe('findLatestFixtureDir', () => {
  it('returns null for a missing fixture root', () => {
    expect(findLatestFixtureDir(path.join(tmpRoot(), 'does-not-exist'))).toBeNull();
  });

  it('returns null when the root holds no json-bearing dirs', () => {
    const root = tmpRoot();
    fs.mkdirSync(path.join(root, '2026-01-01')); // empty dir → not a fixture
    expect(findLatestFixtureDir(root)).toBeNull();
  });

  it('picks the newest json-bearing dir', () => {
    const root = tmpRoot();
    writeFixture(path.join(root, '2026-01-01'), 'equity-summary.json', { list: [] });
    writeFixture(path.join(root, '2026-10-08'), 'equity-summary.json', { list: [] });
    writeFixture(path.join(root, '2026-10-08'), 'summary.json', { summaryValue: 1 });
    expect(findLatestFixtureDir(root)).toContain('2026-10-08');
  });
});

describe('listFixtureFiles orders slices before per-fund fixtures', () => {
  it('orders slice fixtures first, then per-fund captures; ignores meta/summary', () => {
    const dir = tmpRoot();
    ['meta.json', 'summary.json', 'reksadana-BABEL.json', 'reksadana-summary.json', 'equity-summary.json'].forEach(
      f => writeFixture(dir, f, { list: [] })
    );
    expect(listFixtureFiles(dir).map(f => f.file)).toEqual([
      'equity-summary.json',
      'reksadana-summary.json',
      'reksadana-BABEL.json',
    ]);
  });
});

describe('readSummaryBaseline', () => {
  it('returns null when summary.json is absent', () => {
    expect(readSummaryBaseline(tmpRoot())).toBeNull();
  });

  it('rejects non-numeric summaryValue', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'summary.json', { summaryValue: 'bukan angka' });
    const b = readSummaryBaseline(dir) as { parseError: string | null; summaryValue: number | null };
    expect(b.parseError).toBeTruthy();
    expect(b.summaryValue).toBeNull();
  });

  it('reads a numeric summaryValue', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'summary.json', { summaryValue: 12_345 });
    expect(readSummaryBaseline(dir)).toMatchObject({ parseError: null, summaryValue: 12_345 });
  });
});

// ─── the four required synthetic shapes ─────────────────────────────────────

describe('shape 1: well-known container matches', () => {
  it('reports the WELL_KNOWN key and per-field alias hits, ok=true', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'equity-summary.json', {
      code: '2000',
      dataListNodeEmitenList: [
        {
          emitenCode: 'BBCA',
          emitenName: 'Bank Central Asia',
          summaryAmount: 15_000_000,
          jmlLembar: 100,
        },
        {
          emitenCode: 'BBRI',
          emitenName: 'Bank Rakyat Indonesia',
          summaryAmount: 8_500_000,
          jmlLembar: 1000,
        },
      ],
    });
    const fx = verifyFixtureFile(dir, EQUITY, null);
    expect(fx.parseError).toBeNull();
    expect(fx.container).toEqual({ found: true, wellKnownKey: 'dataListNodeEmitenList', fallbackPath: null });
    const byField = Object.fromEntries(fx.fields.map(f => [f.field, f]));
    expect(byField.value).toMatchObject({ alias: 'summaryAmount', key: 'summaryAmount', miss: false });
    expect(byField.code).toMatchObject({ alias: 'emitenCode', key: 'emitenCode', miss: false });
    expect(byField.name).toMatchObject({ alias: 'emitenName', key: 'emitenName', miss: false });
    expect(byField.volume).toMatchObject({ alias: 'jmlLembar', key: 'jmlLembar', miss: false });
    expect(fx.extracted.count).toBe(2);
    expect(fx.extracted.totalValue).toBe(23_500_000);
    expect(fx.ok).toBe(true); // no baseline → reconcile not evaluated
  });
});

describe('shape 2: renamed container → recursive fallback', () => {
  it('locates rows via the fallback and reports the object path', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'equity-summary.json', {
      meta: { page: 1 },
      response: {
        porto: [
          { code: 'TLKM', amount: 5_000_000 },
          { code: 'ASII', amount: 2_500_000 },
        ],
        totalRow: { value: 9_999_999 }, // value-ish but NOT an array — must not win
      },
    });
    const fx = verifyFixtureFile(dir, EQUITY, null);
    expect(fx.container.found).toBe(true);
    expect(fx.container.wellKnownKey).toBeNull();
    expect(fx.container.fallbackPath).toBe('$.response.porto');
    expect(fx.extracted.count).toBe(2);
    expect(fx.extracted.totalValue).toBe(7_500_000);
    expect(fx.ok).toBe(true);
  });
});

describe('shape 3: unknown field names → explicit MISS', () => {
  it('reports MISS with the raw keys that were available — never silent zero', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'equity-summary.json', {
      rows: [{ secName: 'Telkom', price: '12 juta' }], // price present but non-numeric
    });
    const fx = verifyFixtureFile(dir, EQUITY, null);
    // container found via fallback (keys carry a value-ish name)
    expect(fx.container.found).toBe(true);
    // the value field MUST be an explicit MISS, and the report must name
    // the keys that were available on that row
    const valueField = fx.fields.find(f => f.field === 'value');
    expect(valueField?.miss).toBe(true);
    expect(valueField?.alias).toBe('');
    expect(valueField?.key).toBeNull();
    expect(fx.firstRowKeys).toEqual(['secName', 'price']);
    expect(fx.extracted.count).toBe(0); // the visible zero, explained
    expect(fx.dropped.count).toBe(1);
    expect(fx.dropped.exampleReason).toBe('no-value');
    expect(fx.dropped.exampleKeys).toEqual(['secName', 'price']);
    expect(fx.ok).toBe(false); // 0 instruments → fail, loudly
  });
});

describe('shape 4: empty and corrupt fixtures', () => {
  it('empty file → parseError, ok=false', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'equity-summary.json', '');
    const fx = verifyFixtureFile(dir, EQUITY, null);
    expect(fx.parseError).toBe('file kosong');
    expect(fx.ok).toBe(false);
  });

  it('corrupt JSON → parseError naming the problem, ok=false', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'equity-summary.json', '{"list": [trunc');
    const fx = verifyFixtureFile(dir, EQUITY, null);
    expect(fx.parseError).toContain('JSON korup');
    expect(fx.ok).toBe(false);
  });

  it('JSON scalar null → parses but no container, ok=false', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'equity-summary.json', 'null');
    const fx = verifyFixtureFile(dir, EQUITY, null);
    expect(fx.parseError).toBeNull();
    expect(fx.container.found).toBe(false);
    expect(fx.extracted.count).toBe(0);
    expect(fx.ok).toBe(false);
  });

  it('json array of junk objects → rows found, all dropped, ok=false', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'equity-summary.json', '[{"foo":1},{"bar":2}]');
    const fx = verifyFixtureFile(dir, EQUITY, null);
    expect(fx.extracted.count).toBe(0);
    expect(fx.dropped.count).toBe(2);
    expect(fx.ok).toBe(false);
  });
});

// ─── reconciliation + verdict ────────────────────────────────────────────────

describe('reconciliation vs summary.json baseline (per-slice totals)', () => {
  it('delta within Rp 1 (inclusive) → ok', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'summary.json', {
      summaryValue: 99_000_000,
      summaryResponse: [
        { type: 'EKUITAS', summaryAmount: 1_000_000 },
        { type: 'REKSADANA', summaryAmount: 98_000_000 },
      ],
    });
    writeFixture(dir, 'equity-summary.json', {
      list: [{ code: 'BBCA', name: 'Bank Central Asia', summaryAmount: 999_999.4 }],
    });
    const fx = verifyFixtureFile(dir, EQUITY, readSummaryBaseline(dir));
    expect(fx.reconcile.ok).toBe(true);
    expect(fx.reconcile.baselineTotal).toBe(1_000_000); // EKUITAS slice, NOT portfolio total
    expect(fx.ok).toBe(true);
    expect(RECONCILE_TOLERANCE_IDR).toBe(1);
  });

  it('delta beyond Rp 1 → ok=false and dir-level pass=false with reason', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'summary.json', {
      summaryValue: 2_000_000,
      summaryResponse: [{ type: 'EKUITAS', summaryAmount: 2_000_000 }],
    });
    writeFixture(dir, 'equity-summary.json', {
      list: [{ code: 'BBCA', name: 'Bank Central Asia', summaryAmount: 1_500_000 }],
    });
    const report = verifyFixtureDir(dir);
    expect(report.pass).toBe(false);
    expect(report.reason).toContain('selisih vs baseline');
  });

  it('no summaryResponse slice entry → reconciliation skipped with note', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'summary.json', { summaryValue: 1_000_000 }); // no summaryResponse
    writeFixture(dir, 'equity-summary.json', {
      list: [{ code: 'BBCA', name: 'Bank Central Asia', summaryAmount: 1_000_000 }],
    });
    const report = verifyFixtureDir(dir);
    expect(report.fixtures[0].reconcile.ok).toBeNull();
    expect(report.fixtures[0].reconcile.note).toContain('EKUITAS');
    expect(report.pass).toBe(true); // extraction is fine; nothing to reconcile
  });

  it('no baseline → reconciliation skipped, pass rides on extraction only', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'equity-summary.json', {
      dataList: [{ code: 'TLKM', summaryAmount: 10 }],
    });
    const report = verifyFixtureDir(dir);
    expect(report.fixtures[0].reconcile.ok).toBeNull();
    expect(report.pass).toBe(true);
  });

  it('baseline present but corrupt → pass=false', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'summary.json', 'not-json');
    writeFixture(dir, 'equity-summary.json', {
      dataList: [{ code: 'TLKM', summaryAmount: 10 }],
    });
    const report = verifyFixtureDir(dir);
    expect(report.pass).toBe(false);
  });
});

describe('verifyFixtureDir end-to-end on a full synthetic capture', () => {
  it('slice + per-fund fixture reconciles against the baseline', () => {
    const dir = tmpRoot();
    // baseline: EKUITAS 10jt + REKSADANA 5jt = 15jt (slices sum to summary)
    writeFixture(dir, 'summary.json', {
      summaryValue: 15_000_000,
      summaryResponse: [
        { type: 'EKUITAS', summaryAmount: 10_000_000 },
        { type: 'REKSADANA', summaryAmount: 5_000_000 },
      ],
    });
    writeFixture(dir, 'equity-summary.json', {
      dataListEmiten: [
        { emitenCode: 'BBCA', emitenName: 'Bank Central Asia', summaryAmount: 6_000_000 },
        { emitenCode: 'BBRI', emitenName: 'Bank Rakyat Indonesia', summaryAmount: 4_000_000 },
      ],
    });
    writeFixture(dir, 'reksadana-summary.json', {
      fundList: [{ fundCode: 'BABEL', fundName: 'Danamas Instabilitas', summaryAmount: 5_000_000 }],
    });
    writeFixture(dir, 'reksadana-BABEL.json', {
      rows: [{ fundCode: 'BABEL', fundName: 'Danamas Instabilitas', nav: 5_000_000, units: 1000 }],
    });
    const report = verifyFixtureDir(dir);
    expect(report.pass).toBe(true);
    const rd = report.fixtures.find(f => f.file === 'reksadana-summary.json') as NonNullable<
      typeof report.fixtures[number]
    >;
    expect(rd.reconcile.ok).toBe(true);
    const perFund = report.fixtures.find(f => f.file === 'reksadana-BABEL.json');
    expect(perFund?.reconcile.ok).toBeNull(); // per-fund: no slice baseline
    expect(perFund?.ok).toBe(true);
  });
});

// ─── offline guarantee ───────────────────────────────────────────────────────

describe('offline guarantee', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = ((): Promise<Response> => {
      throw new Error('NETWORK ACCESS DENIED — kseiShapeVerify must stay offline');
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('verifyFixtureDir makes zero network calls', () => {
    const dir = tmpRoot();
    writeFixture(dir, 'equity-summary.json', {
      list: [{ code: 'X', name: 'X Corp', value: 1 }],
    });
    expect(() => verifyFixtureDir(dir)).not.toThrow();
    expect(verifyFixtureDir(dir).pass).toBe(true);
  });
});
