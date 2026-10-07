/**
 * KUR-148 — CLI harness: verify fixture shapes with the real
 * extractInstruments(), fully offline. Used by `npm run ksei:verify-shape`.
 *
 * Usage:
 *   tsx scripts/ksei-verify-shape.ts [-- <date>] [--json]
 *
 *   <date>    fixture dir under data/ksei-fixtures/ (default: latest)
 *   --json    machine-readable report (agents/CI); default is plain text
 *
 * Exit codes: 0 = every fixture >=1 instrument AND reconciliation (when a
 * summary.json baseline exists) within Rp 1; 1 = otherwise. NEVER makes a
 * network request — only reads files under data/ksei-fixtures/.
 */

import path from 'node:path';
import process from 'node:process';
import { findLatestFixtureDir, verifyFixtureDir, type VerifyReport } from '../src/lib/kseiShapeVerify';
import { fmtIdr } from '../src/lib/format';

const FIXTURE_ROOT = path.resolve('data/ksei-fixtures');
const PAD = 26;

function pad(label: string): string {
  return label.length >= PAD ? label : label + ' '.repeat(PAD - label.length);
}

function truncateKeys(keys: string[], max = 8): string {
  if (keys.length === 0) return '(tidak ada kunci)';
  const shown = keys.slice(0, max).join(', ');
  return keys.length > max ? `${shown}, … (+${keys.length - max})` : shown;
}

function formatText(report: VerifyReport): string {
  const lines: string[] = [];
  lines.push('══════ KSEI fixture shape verification (KUR-148) ══════');
  if (!report.fixtureDir) {
    lines.push(`Tidak ada fixture di ${FIXTURE_ROOT}/`);
    lines.push('Capture dulu: scripts/ksei-capture-fixtures.sh (butuh token AKSes segar).');
    return lines.join('\n');
  }
  lines.push(`Direktori : ${report.fixtureDir}`);
  if (report.baseline) {
    lines.push(
      report.baseline.parseError
        ? `Baseline  : summary.json — ${report.baseline.parseError}`
        : `Baseline  : summary.json (summaryValue terbaca)`
    );
  } else {
    lines.push('Baseline  : summary.json tidak ada — rekonsiliasi dilewati');
  }
  lines.push('');

  for (const fx of report.fixtures) {
    lines.push(`── ${fx.label} (${fx.file}) ─────────────────────────`);
    if (fx.parseError) {
      lines.push(`  ${pad('Parse')} : GAGAL — ${fx.parseError}`);
      lines.push('');
      continue;
    }
    const container = !fx.container.found
      ? 'TIDAK KETEMU'
      : fx.container.wellKnownKey
        ? `WELL_KNOWN key "${fx.container.wellKnownKey}"`
        : `fallback rekursif: ${fx.container.fallbackPath}`;
    lines.push(`  ${pad('Container')} : ${container}`);
    if (fx.fields.length === 0) {
      lines.push(`  ${pad('Per field')} : (tidak ada baris di container)`);
    } else {
      lines.push(`  ${pad('Per field')} : alias → kunci asli (baris pertama)`);
      for (const f of fx.fields) {
        const hit = f.miss
          ? `MISS (kunci tersedia: ${truncateKeys(fx.firstRowKeys)})`
          : `${f.alias} → ${f.key}`;
        lines.push(`    ${pad(f.field)} : ${hit}`);
      }
    }
    const drop = fx.dropped;
    lines.push(
      `  ${pad('Baris di-drop')} : ${drop.count}` +
        (drop.count > 0
          ? ` (contoh: baris #${drop.exampleIndex}, alasan=${drop.exampleReason}, kunci: ${truncateKeys(drop.exampleKeys)})`
          : '')
    );
    lines.push(
      `  ${pad('Ter-ekstrak')} : ${fx.extracted.count} instrumen, total ${fx.extracted.totalFormatted}`
    );
    const r = fx.reconcile;
    if (r.ok === true) {
      lines.push(`  ${pad('Rekonsiliasi')} : COCOK — baseline slice ${fmtIdr(r.baselineTotal as number)}, selisih ${r.deltaFormatted} (≤ Rp 1)`);
    } else if (r.ok === false) {
      lines.push(
        `  ${pad('Rekonsiliasi')} : SELISIH — baseline slice ${fmtIdr(r.baselineTotal as number)}, ekstrak ${fx.extracted.totalFormatted}, delta ${r.deltaFormatted} (> Rp 1)`
      );
    } else {
      lines.push(`  ${pad('Rekonsiliasi')} : dilewati — ${r.note}`);
    }
    lines.push(`  ${pad('Status')} : ${fx.ok ? 'OK' : 'GAGAL'}`);
    lines.push('');
  }

  lines.push(`HASIL: ${report.pass ? 'LOLOS' : 'GAGAL'} — ${report.reason}`);
  return lines.join('\n');
}

function main(): number {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const dateIdx = args.indexOf('--');
  const date = dateIdx !== -1 ? args[dateIdx + 1] : undefined;
  if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`ERROR: tanggal harus format YYYY-MM-DD, dapat: "${date}"`);
    return 1;
  }

  const dir = date
    ? path.join(FIXTURE_ROOT, date)
    : findLatestFixtureDir(FIXTURE_ROOT);

  if (!date) {
    // findLatestFixtureDir returns null for a missing/empty root — same message
    // either way: the user needs to capture first.
  }
  if (!dir) {
    const report: VerifyReport = {
      fixtureDir: null,
      baseline: null,
      fixtures: [],
      pass: false,
      reason: `tidak ada direktori fixture di ${FIXTURE_ROOT}/ — capture dulu via scripts/ksei-capture-fixtures.sh`,
    };
    if (asJson) console.log(JSON.stringify(report, null, 2));
    else console.log(formatText(report));
    return 1;
  }

  const report = verifyFixtureDir(dir);
  if (asJson) console.log(JSON.stringify(report, null, 2));
  else console.log(formatText(report));
  return report.pass ? 0 : 1;
}

process.exit(main());
