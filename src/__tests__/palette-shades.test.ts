/**
 * Source-scan regression (round 3 marathon, iteration 9):
 * mint/coral palettes only define 400-700 and gold 200-700 in
 * tailwind.config.mjs — classes outside those shades generate no CSS
 * (silently dead styling). Reject any usage of undefined shades.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const DEFINED: Record<string, Set<string>> = {
  mint: new Set(['400', '500', '600', '700']),
  coral: new Set(['400', '500', '600', '700']),
  gold: new Set(['200', '300', '400', '500', '600', '700']),
};

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

describe('tailwind palette — no undefined shade classes', () => {
  it('all mint/coral/gold utility shades exist in tailwind.config', () => {
    const bad: string[] = [];
    for (const f of walk(ROOT)) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/(?:text|bg|border|ring|from|to|via)-(mint|coral|gold)-([0-9]{2,3})(?:\/\d+)?/g)) {
          if (!DEFINED[m[1]].has(m[2])) bad.push(`${f.replace(ROOT + '/', '')}:${i + 1} ${m[0]}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });

  it('no double-opacity suffix on color utilities (e.g. bg-mint-700/30/60)', () => {
    const re = /(?:mint|coral|gold|emerald|red|slate|white|navy)-\d+(?:\/\d+){2,}\b|white\/\d+\/\d+\b/;
    const bad: string[] = [];
    for (const f of walk(ROOT)) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (re.test(line)) {
          bad.push(`${f.replace(ROOT + '/', '')}:${i + 1}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });
});
