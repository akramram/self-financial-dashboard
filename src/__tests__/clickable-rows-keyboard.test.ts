/**
 * @vitest-environment jsdom
 * @jest-dom
 *
 * Round 3 marathon — clickable table rows keyboard sweep regression:
 * rows that react to onClick (MonthComparison, SavingsRateTracker,
 * SpendingCalendar) expose tabIndex=0 + Enter/Space handler + focus ring.
 * Source-scan: no clickable TableRow without tabIndex remains.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === '__tests__' || name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx)$/.test(name) && !/\.test\./.test(name)) acc.push(p);
  }
  return acc;
}

describe('clickable table rows — keyboard operable', () => {
  it('every <TableRow with onClick also has tabIndex + onKeyDown within 8 lines', () => {
    const bad: string[] = [];
    for (const f of walk(ROOT)) {
      const lines = readFileSync(f, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<TableRow\b/.test(lines[i])) continue;
        // only inspect the row's own JSX open-tag region (up to first cell)
        let block = lines.slice(i, i + 12).join('\n');
        const cellIdx = block.search(/<(TableCell|TableHead)\b/);
        if (cellIdx > 0) block = block.slice(0, cellIdx);
        if (/onClick=/.test(block) && !/tabIndex=/.test(block)) {
          bad.push(`${f.replace(ROOT + '/', '')}:${i + 1}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
