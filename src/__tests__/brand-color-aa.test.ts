/**
 * Source-scan contrast regression (round 3 marathon, iteration 5):
 * brand colors mint/coral/gold must meet WCAG AA in light mode —
 * - paired text: mint 500/600 (2.5/3.8:1) → 700; coral 500 (3.8:1) → 600;
 *   gold 500/600 (2.2/3.2:1) → 700 (dark:-400 variants kept)
 * - bare icon colors need 3:1: mint-500 and gold-500 fail on white
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
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (re.test(line)) out.push(`${f.replace(ROOT + '/', '')}:${i + 1}`);
    });
  }
  return out;
};

describe('contrast source-scan — mint/coral/gold AA pairs', () => {
  it('no failing mint pairs in light mode (500/600 → 700)', () => {
    expect(offenders(/text-mint-500 dark:text-mint-400/)).toEqual([]);
    expect(offenders(/text-mint-600 dark:text-mint-400/)).toEqual([]);
  });

  it('no failing coral pairs in light mode (500 → 600)', () => {
    expect(offenders(/text-coral-500 dark:text-coral-400/)).toEqual([]);
  });

  it('no failing gold pairs in light mode (500/600 → 700)', () => {
    expect(offenders(/text-gold-500 dark:text-gold-400/)).toEqual([]);
    expect(offenders(/text-gold-600 dark:text-gold-400/)).toEqual([]);
  });

  it('no bare icon colors below 3:1 on white (mint-500, gold-500)', () => {
    expect(offenders(/(?<![-\w:])text-mint-500(?![\w/-])/)).toEqual([]);
    expect(offenders(/(?<![-\w:])text-gold-500(?![\w/-])/)).toEqual([]);
  });
});
