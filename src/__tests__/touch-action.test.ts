/**
 * touch-action: manipulation — target interaktif (button/a/[role=button]/
 * label/select) bebas delay tap ~300ms iOS double-tap-zoom, pinch-zoom
 * viewport tetap hidup. Regresi: aturan harus tetap ada di globals.css.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('globals.css — touch-action manipulation', () => {
  it('aturan manipulation mencakup button, a, [role=button], label, select', () => {
    const css = readFileSync(join(__dirname, '../styles/globals.css'), 'utf8');
    expect(css).toMatch(/touch-action:\s*manipulation/);
    expect(css).toMatch(/button,\s*\n\s*a,\s*\n\s*\[role='button'\],\s*\n\s*label,\s*\n\s*select\s*\{\s*\n\s*touch-action:\s*manipulation;/);
  });
});
