/**
 * @vitest-environment jsdom
 * @jest-dom
 *
 * A11y regression for NetworthTable (round 3 marathon):
 * actions column header named (sr-only), Edit actions AA-contrast in light
 * mode (mint-700, was mint-500 ~2.5:1), mobile edit link has focus ring.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/vitest';

vi.mock('../lib/api', () => ({
  deleteNetworthApi: vi.fn().mockResolvedValue({ ok: true }),
}));

import NetworthTable from '../components/NetworthTable';
import type { NetworthRecord } from '../lib/data';

function makeRow(i: number): NetworthRecord {
  return {
    period_id: i,
    month: `2026-${String(i).padStart(2, '0')}`,
    date: `2026-${String(i).padStart(2, '0')}-01`,
    total: 10_000_000 + i * 1_000,
    currency: 'IDR',
    month_over_month_change: i === 1 ? null : 250_000,
    month_over_month_pct: i === 1 ? null : 2.5,
    breakdown: {},
  };
}

describe('NetworthTable — a11y regression', () => {
  it('actions column header has an accessible name', () => {
    const { getByRole } = render(<NetworthTable networth={[makeRow(1)]} />);
    expect(getByRole('columnheader', { name: 'Aksi' })).toBeInTheDocument();
  });

  it('Edit actions pass AA in light mode (mint-700 pair, dark mint-400 kept)', () => {
    const { getAllByText } = render(<NetworthTable networth={[makeRow(1), makeRow(2)]} />);
    // Desktop Button + mobile anchor per row
    const edits = getAllByText('Edit');
    expect(edits.length).toBe(4);
    for (const el of edits) {
      const cls = el.closest('a, button')?.className ?? el.className;
      expect(cls).toContain('text-mint-700');
      expect(cls).toContain('dark:text-mint-400');
      expect(cls).not.toMatch(/(^|\s)text-mint-500(\s|$)/);
    }
  });

  it('mobile edit link exposes a visible keyboard focus indicator', () => {
    const { getAllByText } = render(<NetworthTable networth={[makeRow(1)]} />);
    const mobileEdit = getAllByText('Edit').map((el) => el.closest('a')).find((a) => a?.className.includes('min-h-[44px]'));
    expect(mobileEdit).toBeTruthy();
    expect(mobileEdit!.className).toContain('focus-visible:ring-2');
  });
});
