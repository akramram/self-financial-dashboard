/**
 * Scroll-contain & tap-highlight — modal/sheet menyimpan scroll di dalam
 * (overscroll-contain: reach-end tidak meneruskan scroll ke body di belakang
 * overlay), dan tap-highlight abu-abu bawaan browser dimatikan karena umpan
 * balik sentuh sudah disediakan ring fokus + active:scale komponen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

describe('scroll chaining & tap highlight', () => {
  it('SheetContent + DialogContent base punya overscroll-contain', () => {
    const sheet = readFileSync(join(ROOT, 'components/ui/sheet.tsx'), 'utf8');
    const dialog = readFileSync(join(ROOT, 'components/ui/dialog.tsx'), 'utf8');
    expect(sheet).toMatch(/"fixed z-\[80\][^"]*overscroll-contain/);
    expect(dialog).toMatch(/"fixed left-\[50%\][^"]*overscroll-contain/);
  });

  it('globals.css mematikan -webkit-tap-highlight-color pada target interaktif', () => {
    const css = readFileSync(join(ROOT, 'styles/globals.css'), 'utf8');
    expect(css).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
  });
});
