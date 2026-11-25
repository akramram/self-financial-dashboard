/**
 * Source-scan contrast regression (round 3 marathon):
 * text-slate-500 pairs must hold WCAG AA on non-white backgrounds —
 * - dark:text-white/40 (3.81:1 on navy) rejected; /50 (5.26:1) is the floor
 * - dark:text-slate-500 (3.42:1 on navy) rejected; slate-400 (6.34:1) instead
 * - bare/placeholder text-slate-500 (4.34:1 on slate-100, ~3.9 on slate-200)
 *   rejected on tinted light backgrounds; slate-600 instead
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
    else if (/\.(tsx|ts|astro)$/.test(name) && !/\.test\./.test(name)) acc.push(p);
  }
  return acc;
}

const files = walk(ROOT);
expect(files.length).toBeGreaterThan(100);

const offenders = (re: RegExp): string[] => {
  const out: string[] = [];
  for (const f of files) {
    const lines = readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (re.test(line)) out.push(`${f.replace(ROOT + '/', '')}:${i + 1}`);
    });
  }
  return out;
};

describe('contrast source-scan — slate-500 pairs on non-white bg', () => {
  it('no text-slate-500 paired with dark:text-white/40 (fails AA on navy)', () => {
    expect(offenders(/text-slate-500 dark:text-white\/40/)).toEqual([]);
  });

  it('no dark:text-slate-500 text (3.4:1 on dark surfaces)', () => {
    expect(offenders(/dark:text-slate-500(?![\w-])/)).toEqual([]);
  });

  it('no bare/placeholder text-slate-500 on tinted light bg (slate-100/200)', () => {
    const re = /(?<![-\w:\/])text-slate-500|placeholder:text-slate-500/;
    const tinted = /(?<![-\w:])bg-slate-(100|200)\b/;
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (re.test(line) && tinted.test(line)) hits.push(`${f.replace(ROOT + '/', '')}:${i + 1}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('no dim dark placeholders (white/30) on inputs', () => {
    expect(offenders(/dark:placeholder:text-white\/30/)).toEqual([]);
  });
});
