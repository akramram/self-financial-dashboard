import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
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
} from '../lib/alertsStore';

/**
 * FIN-021 — Alerts Detail Drawer.
 *
 * Global island (mounted once in Layout.astro). The sidebar bells
 * (FintechSidebar + MobileSidebar) call openAlertsDrawer() with themselves as
 * the opener so focus can return to the bell on close (a11y AC).
 *
 * Renders the SAME AlertsPanel used on the dashboard with a shared dismiss
 * store (alertsStore.ts), always for the active month, no month switcher (v1).
 */
export default function AlertsDrawer() {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const { status, data, retry } = useAlertsData(open);

  // Bell → drawer bus
  useEffect(() => {
    const onOpen = (e: Event) => {
      openerRef.current =
        ((e as CustomEvent).detail as HTMLElement | undefined) ?? null;
      setOpen(true);
    };
    window.addEventListener(ALERTS_DRAWER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ALERTS_DRAWER_OPEN_EVENT, onOpen);
  }, []);

  // Return focus to the bell that opened the drawer (Escape, backdrop, X)
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      requestAnimationFrame(() => openerRef.current?.focus());
    }
  }, []);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-background dark:bg-navy-900 border-l border-slate-200 dark:border-white/[0.06]"
        aria-describedby={undefined}
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-200 dark:border-white/[0.05] shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-white/90">
            <Bell className="w-4 h-4 text-mint-500" />
            Alerts
            {data?.month && (
              <span className="text-xs font-normal text-slate-400 dark:text-white/40">
                · {data.month}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Alerts for the active month. Dismiss an alert to hide it here and on
            the dashboard.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 sidebar-scroll">
          {status === 'loading' && (
            <div className="space-y-3" role="status" aria-label="Loading alerts">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
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
              emptyState={
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <CheckCircle2 className="w-8 h-8 text-mint-500" />
                  <p className="text-sm font-medium text-slate-700 dark:text-white/70">
                    Tidak ada alert untuk bulan ini
                  </p>
                  <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                    Tutup
                  </Button>
                </div>
              }
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
