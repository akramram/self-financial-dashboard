/**
 * Tap-target sweep regression — icon-only ghost buttons (`p-0` + ukuran <44px)
 * wajib area sentuh >=44px di mobile (min-h-[44px] min-w-[44px], dilepas via
 * md:min-h-0/md:min-w-0 di desktop) dan bernama (aria-label) karena ikon-only.
 * Mengatasi BudgetAlerts collapse + tombol Edit/Delete Portfolio(Tracker|Hub)
 * yang hanya 28-32px.
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

describe('ikon-only Button p-0 — tap target 44px + aria-label', () => {
  it('className p-0 memakai min-h-[44px] dan properti aria-label ada', () => {
    const bad: string[] = [];
    for (const f of walk(ROOT)) {
      const lines = readFileSync(f, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        // hanya blok JSX <Button ... p-0> (ikon-only)
        if (!/<Button\b/.test(lines[i])) continue;
        const block = lines.slice(i, i + 12).join('\n');
        const closeIdx = block.indexOf('>');
        if (closeIdx > 0) {
          const open = block.slice(0, closeIdx);
          if (!/className="[^"]*\bp-0\b/.test(open)) continue;
          const tag = f.replace(ROOT + '/', '');
          if (!/min-h-\[44px\]/.test(open)) bad.push(`${tag}:${i + 1} tanpa min-h-[44px]`);
          if (!/aria-label=/.test(open)) bad.push(`${tag}:${i + 1} tanpa aria-label`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
