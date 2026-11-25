/**
 * inputmode="decimal" — sweep 46 input `type="number"` → `type="text"
 * inputMode="decimal"` (pola yang sudah dipakai TransactionFormFields):
 * keyboard numerik iOS/Android tetap muncul, tanpa spinner & tanpa wheel-scroll
 * mengubah nilai di iOS. Regresi: tidak ada lagi input type="number" di src.
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
    else if (/\.(tsx|astro)$/.test(name) && !/\.test\./.test(name)) acc.push(p);
  }
  return acc;
}

describe('input numerik mobile-friendly', () => {
  it('tidak ada type="number" tersisa; pasangan inputMode="decimal" dipakai', () => {
    const bad: string[] = [];
    let decimalSeen = false;
    for (const f of walk(ROOT)) {
      const src = readFileSync(f, 'utf8');
      if (/type=["']number["']/.test(src)) bad.push(f.replace(ROOT + '/', ''));
      if (/inputMode=["']decimal["']/.test(src)) decimalSeen = true;
    }
    expect(bad).toEqual([]);
    expect(decimalSeen).toBe(true);
  });
});
