import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  CheckCircle2,
  CheckCheck,
  CreditCard,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import AlertsPanel from './AlertsPanel';
import {
  ALERTS_DRAWER_OPEN_EVENT,
  useAlertsData,
  dismissAllAlertsShared,
  restoreAlertsSnapshot,
  setAlertPrefShared,
  getAlertsState,
  subscribeAlerts,
  type AlertsSnapshot,
  type AlertsData,
} from '../lib/alertsStore';
import {
  classifyBudgetAlert,
  anomalyPrefFamily,
  type AlertPrefKey,
} from '../lib/alertRules';

/**
 * FIN-021 — Alerts Detail Drawer (KUR-117 design spec) + FIN-022 lanjutan —
 * Alert Preferences push-view (AC-4, KUR-132 ruling + KUR-128 §6/§8).
 *
 * Global island (mounted once in Layout.astro). The sidebar bells
 * (FintechSidebar + MobileSidebar) call openAlertsDrawer() with themselves as
 * the opener so focus can return to the bell on close (a11y AC).
 *
 * Preferences (FIN-022 lanjutan) are a push-view INSIDE this same Sheet
 * (KUR-128 §3: one dialog, one focus trap — Escape closes the whole drawer).
 * Exactly four flat toggles (no master, no category-outlier row — never
 * produced server-side, KUR-132 §3). Prefs persist in SQLite via PATCH
 * /api/alerts/state and apply immediately to the list, the empty state, and
 * (via the same table) the SSR badge — AC-8.
 */

const MUTED = 'text-[hsl(var(--muted-foreground))]';

interface PrefRowDef {
  key: AlertPrefKey;
  label: string;
  helper: string;
  group: 'Anggaran' | 'Anomali';
}

// Copy follows KUR-128 §4 tone. Labels exactly per the KUR-132 ruling table.
const PREF_ROWS: PrefRowDef[] = [
  {
    key: 'budget_over',
    label: 'Budget over-limit',
    helper: 'Pengeluaran kategori melewati batas bulanan',
    group: 'Anggaran',
  },
  {
    key: 'budget_approaching',
    label: 'Budget approaching 80–99%',
    helper: 'Mendekati batas, belum lewat',
    group: 'Anggaran',
  },
  {
    key: 'anomaly_amount_spike',
    label: 'Jumlah tak wajar',
    helper: 'Transaksi jauh di atas pola biasanya',
    group: 'Anomali',
  },
  {
    key: 'anomaly_new_merchant',
    label: 'Merchant baru',
    helper: 'Transaksi pertama di merchant yang belum pernah tercatat',
    group: 'Anomali',
  },
];

// Per-row icons (§2): budget rows share the card/trend icons, anomalies keep
// their type icons — same shapes the alert cards use.
const PREF_ICONS: Record<AlertPrefKey, React.ReactNode> = {
  budget_over: <CreditCard className="h-4 w-4" strokeWidth={1.8} />,
  budget_approaching: <TrendingUp className="h-4 w-4" strokeWidth={1.8} />,
  anomaly_amount_spike: <TrendingUp className="h-4 w-4" strokeWidth={1.8} />,
  anomaly_new_merchant: <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />,
};

export default function AlertsDrawer() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'prefs'>('list');
  const openerRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { status, data, retry } = useAlertsData(open);

  // Bell → drawer bus
  useEffect(() => {
    const onOpen = (e: Event) => {
      openerRef.current =
        ((e as CustomEvent).detail as HTMLElement | undefined) ?? null;
      setOpen(true);
      setView('list');
      // Mirror state to the bells' aria-expanded (handleOpenChange only
      // fires on Radix-initiated changes, not this programmatic open).
      window.dispatchEvent(
        new CustomEvent('fin-alerts-drawer-state', { detail: true }),
      );
    };
    window.addEventListener(ALERTS_DRAWER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ALERTS_DRAWER_OPEN_EVENT, onOpen);
  }, []);

  // Return focus to the bell that opened the drawer (Escape, backdrop, X)
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setView('list');
    // Sidebar bells mirror this for aria-expanded (spec §5).
    window.dispatchEvent(
      new CustomEvent('fin-alerts-drawer-state', { detail: next }),
    );
    if (!next) {
      requestAnimationFrame(() => openerRef.current?.focus());
    }
  }, []);

  // Initial focus on the container (spec §5) — never a dismiss button.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => scrollRef.current?.focus());
    }
  }, [open]);

  // §8: moving between list and preferences moves focus to the view container.
  const prefsViewRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (open && view === 'prefs') {
      requestAnimationFrame(() => prefsViewRef.current?.focus());
    }
  }, [view, open]);

  // ── Preferences mirror the shared store (SQLite-backed, KUR-132 §2) ──
  const [prefs, setPrefs] = useState<Record<AlertPrefKey, boolean>>(() => ({
    ...getAlertsState().prefs,
  }));
  useEffect(() => {
    const sync = () => setPrefs({ ...getAlertsState().prefs });
    sync();
    return subscribeAlerts(sync);
  }, []);

  const handleToggle = (key: AlertPrefKey, enabled: boolean) => {
    setPrefs((p) => ({ ...p, [key]: enabled }));
    setAlertPrefShared(key, enabled);
  };

  // Live alert count — AlertsPanel broadcasts its exact computed total on
  // every recompute (dashboard instance mounts on /; this drawer's instance
  // broadcasts while open), including optimistic drops on dismiss.
  const [liveCount, setLiveCount] = useState(0);
  useEffect(() => {
    const onCount = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      if (typeof n === 'number' && n >= 0) {
        setLiveCount(n);
        // Fresh alerts arrived after a mark-all — leave the "marked" state.
        if (n > 0) setJustMarkedAll(false);
      }
    };
    window.addEventListener('alerts-count', onCount);
    return () => window.removeEventListener('alerts-count', onCount);
  }, []);

  // ── FIN-022 (AC-6): bulk mark-all-read + "Pulihkan semua alert bulan ini".
  // The visible-alert snapshot comes from the drawer's own AlertsPanel
  // instance; content-equality guard keeps the snapshot callback loop-free.
  // markedSnapshotRef keeps the exact pre-batch scope: after the list empties,
  // AlertsPanel re-publishes an empty snapshot, so restore must not read the
  // live one anymore.
  const visibleSnapshotRef = useRef<AlertsSnapshot | null>(null);
  const markedSnapshotRef = useRef<AlertsSnapshot | null>(null);
  const [justMarkedAll, setJustMarkedAll] = useState(false);
  const [, forceSnapshotSync] = useState(0);
  const handleVisibleAlerts = useCallback((snap: AlertsSnapshot) => {
    const prev = visibleSnapshotRef.current;
    if (
      prev &&
      prev.anomalyIds.length === snap.anomalyIds.length &&
      prev.budgetKeys.length === snap.budgetKeys.length &&
      prev.anomalyIds.every((v, i) => v === snap.anomalyIds[i]) &&
      prev.budgetKeys.every((v, i) => v === snap.budgetKeys[i])
    ) {
      return;
    }
    visibleSnapshotRef.current = snap;
    forceSnapshotSync((n) => n + 1);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    const snap = visibleSnapshotRef.current;
    if (!snap || snap.anomalyIds.length + snap.budgetKeys.length === 0) return;
    dismissAllAlertsShared(snap);
    markedSnapshotRef.current = snap;
    setJustMarkedAll(true);
  }, []);

  const handleRestoreAll = useCallback(() => {
    const snap = markedSnapshotRef.current ?? visibleSnapshotRef.current;
    if (!snap || (snap.anomalyIds.length === 0 && snap.budgetKeys.length === 0)) return;
    restoreAlertsSnapshot(snap);
    markedSnapshotRef.current = null;
    setJustMarkedAll(false);
  }, []);

  // Varian C: alerts currently hidden by preferences (list shown only when
  // data is ready; otherwise the chip is hidden too).
  const mutedCount = useMemo(() => {
    if (!data) return 0;
    return countMutedAlerts(data, prefs);
  }, [data, prefs]);
  const prefsActive = useMemo(() => Object.values(prefs).some((v) => !v), [prefs]);

  const grouped = useMemo(
    () => ({
      Anggaran: PREF_ROWS.filter((r) => r.group === 'Anggaran'),
      Anomali: PREF_ROWS.filter((r) => r.group === 'Anomali'),
    }),
    [],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[400px] sm:w-[calc(100vw-48px)] p-0 flex flex-col border-l border-[hsl(var(--surface-border)/0.12)] shadow-elevation-3 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
        style={{
          backgroundColor: 'hsl(var(--card) / 0.95)',
          backdropFilter: 'blur(24px)',
        }}
        aria-describedby={undefined}
      >
        {view === 'list' ? (
          <SheetHeader className="h-14 shrink-0 flex-row items-center gap-2 overflow-hidden border-b border-[hsl(var(--surface-border)/0.08)] px-4 py-0 space-y-0">
            <Bell
              className={`h-5 w-5 shrink-0 ${
                liveCount > 0 ? 'text-mint-500' : 'text-slate-400 dark:text-white/40'
              }`}
              strokeWidth={1.8}
            />
            <SheetTitle className="text-base font-semibold text-slate-800 dark:text-white/90">
              Alerts
            </SheetTitle>
            <span
              className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
              style={{ backgroundColor: 'hsl(var(--muted))' }}
            >
              {liveCount} aktif
            </span>
            {mutedCount > 0 && (
              <span
                className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
                style={{ backgroundColor: 'hsl(var(--muted))', opacity: 0.75 }}
                data-testid="alerts-muted-count"
              >
                {mutedCount} dibisukan
              </span>
            )}
            {/* FIN-022 lanjutan (§6): preferences trigger, ≥44px target. */}
            <button
              type="button"
              onClick={() => setView('prefs')}
              aria-label="Preferensi Alert"
              data-testid="open-alert-prefs"
              className="mr-12 ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[hsl(var(--surface-hover))] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-white/50 dark:hover:text-white/80"
            >
              <SlidersHorizontal className="h-5 w-5" strokeWidth={1.8} />
            </button>
          </SheetHeader>
        ) : (
          <SheetHeader className="h-14 shrink-0 flex-row items-center gap-1 border-b border-[hsl(var(--surface-border)/0.08)] px-2 py-0 space-y-0">
            <button
              type="button"
              onClick={() => setView('list')}
              aria-label="Kembali ke daftar alert"
              data-testid="alert-prefs-back"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[hsl(var(--surface-hover))] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-white/50 dark:hover:text-white/80"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <SheetTitle className="text-base font-semibold text-slate-800 dark:text-white/90">
              Preferensi Alert
            </SheetTitle>
            <SheetDescription className="sr-only">
              Atur jenis alert yang ingin ditampilkan. Perubahan tersimpan
              otomatis.
            </SheetDescription>
          </SheetHeader>
        )}

        {view === 'prefs' ? (
          <div
            ref={prefsViewRef}
            tabIndex={-1}
            className="flex-1 overflow-y-auto overscroll-contain outline-none sidebar-scroll"
            data-testid="alert-prefs-view"
          >
            {(Object.keys(grouped) as ('Anggaran' | 'Anomali')[]).map((group) => (
              <section key={group} aria-labelledby={`prefs-heading-${group}`}>
                <h3
                  id={`prefs-heading-${group}`}
                  className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/40"
                >
                  {group}
                </h3>
                <ul>
                  {grouped[group].map((row) => (
                    <li key={row.key}>
                      {/* Whole row = hit area: <label> bound to the Switch. */}
                      <label
                        htmlFor={`pref-switch-${row.key}`}
                        data-testid={`pref-row-${row.key}`}
                        className="flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-[hsl(var(--surface-hover))] focus-within:bg-[hsl(var(--surface-hover))]"
                      >
                        <span className="shrink-0 text-slate-400 dark:text-white/40">
                          {PREF_ICONS[row.key]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {row.label}
                          </span>
                          <span className={`block text-[13px] leading-snug ${MUTED}`}>
                            {row.helper}
                          </span>
                        </span>
                        {/* pointerDown prevented so a click toggles once via
                            the label (Radix root, not the label's default). */}
                        <Switch
                          id={`pref-switch-${row.key}`}
                          checked={prefs[row.key]}
                          onCheckedChange={(v) => handleToggle(row.key, v)}
                          onPointerDown={(e) => e.preventDefault()}
                          className="shrink-0 data-[state=checked]:bg-mint-500 data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-white/20 motion-reduce:transition-none"
                          aria-label={`${row.label}: ${prefs[row.key] ? 'aktif' : 'mati'}`}
                        />
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <p
              className={`px-4 py-4 text-center text-xs ${MUTED}`}
              data-testid="prefs-autosave-note"
            >
              Preferensi tersimpan otomatis
            </p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            tabIndex={-1}
            className="flex-1 overflow-y-auto overscroll-contain p-4 outline-none sidebar-scroll"
          >
            {status === 'loading' && (
              <div className="space-y-3" role="status" aria-label="Loading alerts">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <AlertTriangle className="h-8 w-8 text-gold-500" />
                <p className={`text-sm ${MUTED}`}>
                  Gagal memuat alert. Periksa koneksi lalu coba lagi.
                </p>
                <Button variant="outline" size="sm" onClick={retry}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              </div>
            )}

            {status === 'ready' && data && (
              <AlertsPanel
                month={data.month}
                summaries={data.summaries}
                categories={data.categories}
                transactions={data.transactions}
                recurringTitles={data.recurringTitles}
                anomalies={data.anomalies}
                showHeader={false}
                variant="drawer"
                onVisibleAlertsChange={handleVisibleAlerts}
                emptyState={
                  justMarkedAll ? (
                    <div
                      className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center"
                      data-testid="alerts-empty-state"
                    >
                      <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-mint-500/10">
                        <CheckCheck className="h-10 w-10 text-mint-500 opacity-40 motion-reduce:transition-none" />
                      </span>
                      <p className="text-[15px] font-semibold text-slate-800 dark:text-white/80">
                        Semua alert ditandai
                      </p>
                      {/* KUR-132 §4: recovery is permanent + server-backed —
                          never claim session scope. */}
                      <p className={`text-[13px] ${MUTED}`}>
                        Pemulihan bersifat permanen dan tersimpan di server.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-11"
                        onClick={handleRestoreAll}
                        data-testid="restore-all-alerts"
                      >
                        Pulihkan semua alert bulan ini
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-11"
                        onClick={() => handleOpenChange(false)}
                      >
                        Tutup
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center"
                      data-testid="alerts-empty-state"
                    >
                      <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-mint-500/10">
                        <CheckCircle2 className="h-10 w-10 text-mint-500 opacity-40 motion-reduce:transition-none" />
                      </span>
                      <p className="text-[15px] font-semibold text-slate-800 dark:text-white/80">
                        Semua alert tertangani
                      </p>
                      {/* Varian C: when preferences mute alerts, say how many
                          and offer the toggle — never a session-scope claim. */}
                      <p className={`text-[13px] ${MUTED}`}>
                        {prefsActive && mutedCount > 0
                          ? `${mutedCount} alert disembunyikan oleh preferensi.`
                          : 'Tidak ada alert anggaran atau anomali bulan ini.'}
                      </p>
                      {prefsActive && mutedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setView('prefs')}
                          data-testid="empty-open-prefs"
                          className="inline-flex h-11 items-center text-[13px] font-medium text-mint-600 underline-offset-2 hover:underline dark:text-mint-400"
                        >
                          Ubah preferensi alert
                        </button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-11"
                        onClick={() => handleOpenChange(false)}
                      >
                        Tutup
                      </Button>
                    </div>
                  )
                }
              />
            )}
          </div>
        )}

        {/* FIN-022 (AC-6): sticky footer bulk action — only while the list is
            ready and non-empty; hidden entirely at 0 alerts (and in prefs
            view — one dialog, one action surface at a time). */}
        {view === 'list' && status === 'ready' && liveCount > 0 && (
          <div
            className="shrink-0 border-t border-[hsl(var(--surface-border)/0.08)] px-4 py-3"
            style={{ backgroundColor: 'hsl(var(--card) / 0.95)' }}
          >
            <Button
              variant="outline"
              className="h-11 w-full gap-2 rounded-lg"
              onClick={handleMarkAllRead}
              aria-label="Tandai semua alert dibaca"
              data-testid="mark-all-read"
            >
              <CheckCheck className="h-4 w-4" />
              Tandai semua dibaca
            </Button>
          </div>
        )}

        {/* FIN-022: single polite announcement for bulk actions (never per-card). */}
        <span className="sr-only" aria-live="polite">
          {justMarkedAll ? 'Semua alert ditandai' : ''}
        </span>
      </SheetContent>
    </Sheet>
  );
}

// ─── Muted-count helper (Varian C) ──────────────────────────────────────────
// Counts alerts the CURRENT prefs would hide, from the same data the list
// renders. Uses the shared classifyBudgetAlert / anomalyPrefFamily rules —
// no duplicated thresholds.

function countMutedAlerts(
  data: AlertsData,
  prefs: Record<AlertPrefKey, boolean>,
): number {
  const summary = data.month
    ? data.summaries.find((s) => s.month === data.month)
    : data.summaries[data.summaries.length - 1];
  let muted = 0;

  if (summary?.category_totals) {
    const limits: Record<string, number> = {};
    for (const c of data.categories) {
      if (c.monthly_limit > 0) limits[c.name] = c.monthly_limit;
    }
    const recurringSet = new Set(
      (data.recurringTitles || []).map((t) => t.toLowerCase()),
    );
    const disc: Record<string, number> = {};
    for (const t of data.transactions || []) {
      if (
        t.period_id === summary.period_id &&
        t.done &&
        (t.type === 'cash' || t.type === 'credit_expense') &&
        !recurringSet.has(t.title.toLowerCase())
      ) {
        disc[t.category] = (disc[t.category] || 0) + t.amount;
      }
    }
    for (const [cat, amount] of Object.entries(summary.category_totals)) {
      const limit = limits[cat] ?? 0;
      const cls = classifyBudgetAlert(amount, limit, (disc[cat] ?? 0) === 0);
      if (cls && !prefs[cls.family]) muted++;
    }
  }

  for (const a of data.anomalies) {
    const family = anomalyPrefFamily(a.reason);
    if (family && !prefs[family]) muted++;
  }
  return muted;
}
