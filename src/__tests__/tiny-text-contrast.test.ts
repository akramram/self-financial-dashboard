/**
 * Source-scan regression: tiny helper text must not use AA-failing
 * dark:text-white/25–35 shades. Decorative icons (w-N h-N) and the
 * Achievements bullet glyph are exempt (3:1 graphics rule).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const roots = [
  join(__dirname, '../components'),
  join(__dirname, '../pages'),
];

describe('AA contrast sweep — no dim tiny text (dark:text-white/25–35)', () => {
  it('has no text-bearing lines using dark:text-white/20–35', () => {
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walk(root)) {
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          if (/dark:text-white\/(2[0-9]|3[0-5])\b/.test(line) && !/(w-\d+\s+h-\d+|•)/.test(line)) {
            offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`);
          }
        });
      }
    }
    expect(offenders).toEqual([]);
  });

  it('has no light-mode text using bare text-slate-400 (3.0:1) — helpers use slate-500+', () => {
    const icon = /(w-\d+\s+h-\d+|[A-Z][a-zA-Z]+\s+className|•|<circle|<path|<svg|stroke|fill=|-translate-y-1\/2|hover:text-slate-600|opacity-(0|40|50)\b)/;
    const bare = /(?<![:\w-])text-slate-400(?![/\w-])/;
    const sized = /text-(xs|sm|\[11px\]|\[10px\])/;
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walk(root)) {
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          if (bare.test(line) && !(icon.test(line) && !sized.test(line))) {
            offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`);
          }
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
