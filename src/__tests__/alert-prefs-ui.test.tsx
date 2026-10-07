/**
 * @vitest-environment jsdom
 * @jest-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/vitest';

/**
 * FIN-022 lanjutan (KUR-132 ruling) — Alert Preferences UI (AC-4):
 * four flat toggles in a push-view inside the alerts drawer, SQLite-backed,
 * list/badge filtering, muted-count empty state, and the corrected mark-all
 * copy (no undo toast).
 */

import AlertsDrawer from '../components/AlertsDrawer';
import { openAlertsDrawer, resetAlertsState } from '../lib/alertsStore';
import { resetAlertsDataCache } from '../lib/alertsStore';

const ALL_ON = {
  budget_over: true,
  budget_approaching: true,
  anomaly_amount_spike: true,
  anomaly_new_merchant: true,
};

function stubRoutes(routes: Record<string, unknown>) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const match = Object.keys(routes).find((k) => url.includes(k));
    const payload = match ? routes[match] : [];
    return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) } as any);
  }) as any;
}

const TWO_ANOMALIES = [
  {
    id: 7, title: 'Weird txn', category: 'Food', amount: 900000, type: 'cash',
    created_time: '2026-07-09', reason: 'amount_spike' as const, severity: 'high' as const,
    detail: 'spike',
  },
  {
    id: 8, title: 'Toko Baru', category: 'Drink', amount: 120000, type: 'cash',
    created_time: '2026-07-10', reason: 'new_merchant' as const, severity: 'low' as const,
    detail: 'first time',
  },
];

function baseRoutes(anomalies: unknown[]) {
  return stubRoutes({
    '/api/summary': [
      {
        period_id: 1,
        month: 'July 2026',
        date: '2026-07-01',
        income: 10_000_000,
        outcome: { cash: 4_000_000, credit_payment: 0, credit_expenses: 0, total: 4_000_000 },
        invest_total: 0,
        savings: 0,
        savings_rate_pct: 0,
        networth: 0,
        category_totals: { Food: 600000 },
      },
    ],
    '/api/categories': [{ id: 1, name: 'Food', color: '#ef4444', monthly_limit: 500000 }],
    '/api/transactions': [
      { id: 1, period_id: 1, title: 'Steak', category: 'Food', amount: 600000, type: 'cash', done: 1 },
    ],
    '/api/recurring-transactions': [],
    '/api/anomalies': anomalies,
    '/api/alerts/state': { dismissed: [], prefs: { ...ALL_ON } },
  });
}

async function openDrawerAndPrefs(fetchStub: any) {
  globalThis.fetch = fetchStub;
  render(
    <>
      <button data-testid="bell" onClick={() => openAlertsDrawer()}>Bell</button>
      <AlertsDrawer />
    </>,
  );
  fireEvent.click(screen.getByTestId('bell'));
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  fireEvent.click(screen.getByTestId('open-alert-prefs'));
  await waitFor(() => {
    expect(screen.getByTestId('alert-prefs-view')).toBeInTheDocument();
  });
}

describe('FIN-022 lanjutan — Alert Preferences UI (AC-4, KUR-132)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAlertsState();
    resetAlertsDataCache();
    const store: Record<string, string> = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = val; });
  });

  afterEach(() => {
    // @ts-expect-error test global
    delete globalThis.fetch;
    vi.restoreAllMocks();
  });

  it('renders exactly four flat rows with the ruling labels — no master, no outlier (spec §1)', async () => {
    await openDrawerAndPrefs(baseRoutes([]));

    expect(screen.getByText('Budget over-limit')).toBeInTheDocument();
    expect(screen.getByText('Budget approaching 80–99%')).toBeInTheDocument();
    expect(screen.getByText('Jumlah tak wajar')).toBeInTheDocument();
    expect(screen.getByText('Merchant baru')).toBeInTheDocument();

    // Ruling: no master "Deteksi anomali", no "Kategori outlier" toggle.
    expect(screen.queryByText(/deteksi anomali/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kategori outlier/i)).not.toBeInTheDocument();

    // Headings + autosave footer, no save button.
    expect(screen.getByRole('heading', { name: 'Anggaran' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Anomali' })).toBeInTheDocument();
    expect(screen.getByTestId('prefs-autosave-note')).toHaveTextContent(
      'Preferensi tersimpan otomatis',
    );
    expect(screen.queryByRole('button', { name: /simpan/i })).not.toBeInTheDocument();

    // Exactly 4 switches, all checked (absent rows = ON).
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(4);
    for (const s of switches) expect(s).toBeChecked();

    // Whole row is the hit area: <label> bound to its switch.
    const row = screen.getByTestId('pref-row-budget_over');
    expect(row.tagName).toBe('LABEL');
    expect(row).toHaveAttribute('for', 'pref-switch-budget_over');
  });

  it('toggling a family OFF filters the drawer list, chips the muted count, and PATCHes once', async () => {
    const fetchStub = baseRoutes(TWO_ANOMALIES);
    await openDrawerAndPrefs(fetchStub);

    fireEvent.click(screen.getByRole('switch', { name: /Jumlah tak wajar/ }));

    await waitFor(() => {
      const s = screen.getByRole('switch', { name: /Jumlah tak wajar/ });
      expect(s).not.toBeChecked();
    });

    fireEvent.click(screen.getByTestId('alert-prefs-back'));
    await waitFor(() => {
      expect(screen.getByText('Toko Baru')).toBeInTheDocument();
      expect(screen.queryByText('Weird txn')).not.toBeInTheDocument();
      expect(screen.getByText(/Food is over budget/)).toBeInTheDocument();
    });

    // Muted chip appears in the header.
    await waitFor(() => {
      expect(screen.getByTestId('alerts-muted-count')).toHaveTextContent('1 dibisukan');
    });

    const patches = (globalThis.fetch as any).mock.calls.filter(
      (c: unknown[]) => String(c[0]).includes('/api/alerts/state') && (c[1] as any)?.method === 'PATCH',
    );
    expect(patches).toHaveLength(1);
    expect(JSON.parse((patches[0][1] as any).body)).toEqual({
      pref: 'anomaly_amount_spike',
      enabled: false,
    });
  });

  it('toggle OFF → ON brings the same alert back (prefs are a pure view filter, spec test #3)', async () => {
    await openDrawerAndPrefs(baseRoutes(TWO_ANOMALIES));

    const sw = () => screen.getByRole('switch', { name: /Jumlah tak wajar/ });
    fireEvent.click(sw());
    await waitFor(() => expect(sw()).not.toBeChecked());

    fireEvent.click(screen.getByTestId('alert-prefs-back'));
    await waitFor(() => expect(screen.queryByText('Weird txn')).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId('open-alert-prefs'));
    await waitFor(() => expect(screen.getByTestId('alert-prefs-view')).toBeInTheDocument());
    fireEvent.click(sw());
    await waitFor(() => expect(sw()).toBeChecked());

    fireEvent.click(screen.getByTestId('alert-prefs-back'));
    await waitFor(() => expect(screen.getByText('Weird txn')).toBeInTheDocument());
  });

  it('empty state states the muted count and links to preferences (Varian C)', async () => {
    await openDrawerAndPrefs(baseRoutes([]));

    // Mute the (only) budget family so the list empties.
    fireEvent.click(screen.getByRole('switch', { name: /Budget over-limit/ }));
    await waitFor(() => {
      const s = screen.getByRole('switch', { name: /Budget over-limit/ });
      expect(s).not.toBeChecked();
    });

    fireEvent.click(screen.getByTestId('alert-prefs-back'));
    await waitFor(() => {
      expect(screen.getByText(/1 alert disembunyikan oleh preferensi/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('empty-open-prefs'));
    await waitFor(() => {
      expect(screen.getByTestId('alert-prefs-view')).toBeInTheDocument();
    });
  });

  it('mark-all sub-copy promises permanent, server-backed recovery — no undo toast (KUR-132 §4)', async () => {
    await openDrawerAndPrefs(baseRoutes(TWO_ANOMALIES));
    fireEvent.click(screen.getByTestId('alert-prefs-back'));
    await waitFor(() => {
      expect(screen.getByText('Weird txn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mark-all-read'));
    await waitFor(() => {
      expect(screen.getByText('Pemulihan bersifat permanen dan tersimpan di server.')).toBeInTheDocument();
    });
    expect(screen.getByTestId('restore-all-alerts')).toHaveTextContent(
      'Pulihkan semua alert bulan ini',
    );
    // The wrong session-scope promise from KUR-128 §5 must be gone.
    expect(screen.queryByText(/urungkan sampai drawer ditutup/i)).not.toBeInTheDocument();
    // No sonner Toaster mounted.
    expect(document.querySelector('[data-sonner-toaster]')).toBeNull();
  });

  it('FIN-023 F-1 — prefs trigger clears the sheet close button (mr-12 + DOM order after it)', async () => {
    await openDrawerAndPrefs(baseRoutes([]));
    // openDrawerAndPrefs lands in the prefs push-view; the trigger lives in
    // the list header, so navigate back.
    fireEvent.click(screen.getByTestId('alert-prefs-back'));
    await waitFor(() => {
      expect(screen.getByTestId('open-alert-prefs')).toBeInTheDocument();
    });

    const trigger = screen.getByTestId('open-alert-prefs');

    // Class-level: trigger must reserve the X column (right-3 + 40px wide).
    expect(trigger.className).toContain('mr-12');

    // DOM-position level (jsdom has no hit-testing): the built-in close
    // (SheetPrimitive.Close, absolute right-3) is the LAST direct child of
    // the dialog content, so it comes after the header — the trigger sits to
    // its left thanks to mr-12 instead of under it.
    const content = trigger.closest('[role="dialog"]') as HTMLElement | null;
    // SheetHeader renders a div; the trigger is its direct child.
    const header = trigger.parentElement as HTMLElement | null;
    expect(content).not.toBeNull();
    expect(header).not.toBeNull();
    const directButtons = Array.from(
      content!.querySelectorAll(':scope > button'),
    );
    const closeBtn = directButtons[directButtons.length - 1];
    expect(closeBtn).toBeDefined();
    expect(header!.compareDocumentPosition(closeBtn as Node) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Header clips stray overflow so the chips can never push the trigger
    // under the X.
    expect(header!.className).toContain('overflow-hidden');
    for (const chip of header!.querySelectorAll('span.rounded-full')) {
      expect(chip.className).toContain('whitespace-nowrap');
    }
  });
});
