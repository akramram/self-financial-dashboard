import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, AlertTriangle, CheckCircle2, CheckCheck, RefreshCw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AlertsPanel from './AlertsPanel';
import {
  ALERTS_DRAWER_OPEN_EVENT,
  useAlertsData,
  dismissAllAlertsShared,
  restoreAlertsSnapshot,
  type AlertsSnapshot,
} from '../lib/alertsStore';

/**
 * FIN-021 — Alerts Detail Drawer (KUR-117 design spec).
 *
 * Global island (mounted once in Layout.astro). The sidebar bells
 * (FintechSidebar + MobileSidebar) call openAlertsDrawer() with themselves as
 * the opener so focus can return to the bell on close (a11y AC).
 *
 * Anatomy (spec §1): 56px sticky header (bell → "Alerts" → count chip → X),
 * scrollable 16px body listing ALL alerts (no top-5 collapse), no footer.
 * 400px desktop / full-width mobile. Initial focus lands on the scroll
 * container (tabindex=-1), never on a dismiss button. The bell stays enabled
 * at 0 alerts and shows the spec's empty state.
 */
export default function AlertsDrawer() {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { status, data, retry } = useAlertsData(open);

  // Bell → drawer bus
  useEffect(() => {
    const onOpen = (e: Event) => {
      openerRef.current =
        ((e as CustomEvent).detail as HTMLElement | undefined) ?? null;
      setOpen(true);
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


  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[400px] sm:w-[calc(100vw-48px)] p-0 flex flex-col border-l border-[hsl(var(--surface-border)/0.12)] shadow-elevation-3 pb-[env(safe-area-inset-bottom)]"
        style={{
          backgroundColor: 'hsl(var(--card) / 0.95)',
          backdropFilter: 'blur(24px)',
        }}
        aria-describedby={undefined}
      >
        <SheetHeader className="h-14 shrink-0 flex-row items-center gap-2 border-b border-[hsl(var(--surface-border)/0.08)] px-4 py-0 space-y-0">
          <Bell
            className={`w-5 h-5 shrink-0 ${
              liveCount > 0 ? 'text-mint-500' : 'text-slate-400 dark:text-white/40'
            }`}
            strokeWidth={1.8}
          />
          <SheetTitle className="text-base font-semibold text-slate-800 dark:text-white/90">
            Alerts
          </SheetTitle>
          <span
            className="text-xs font-semibold rounded-full px-2 py-0.5 tabular-nums"
            style={{ backgroundColor: 'hsl(var(--muted))' }}
          >
            {liveCount} aktif
          </span>
          <span className="w-10 shrink-0 ml-auto" aria-hidden="true" />
        </SheetHeader>

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
              <AlertTriangle className="w-8 h-8 text-gold-500" />
              <p className="text-sm text-slate-500 dark:text-white/50">
                Gagal memuat alert. Periksa koneksi lalu coba lagi.
              </p>
              <Button variant="outline" size="sm" onClick={retry}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
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
                    <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
                      Kamu bisa memulihkan semua alert bulan ini.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={handleRestoreAll}
                      data-testid="restore-all-alerts"
                    >
                      Pulihkan semua alert bulan ini
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
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
                      You're all caught up
                    </p>
                    <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
                      No budget or anomaly alerts this month.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
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

        {/* FIN-022 (AC-6): sticky footer bulk action — only while the list is
            ready and non-empty; hidden entirely at 0 alerts. */}
        {status === 'ready' && liveCount > 0 && (
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
