import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LayoutDashboard, ArrowRightLeft, PieChart, Target, Settings,
  TrendingUp, Calendar, Shield, Wallet, CreditCard, X, Bell,
  Trophy, Flame, Heart, BarChart3, FlaskConical, Briefcase, PiggyBank,
  Repeat, Search, FileText, GitCompare, Activity, Layers, CalendarDays, Zap, Grid3x3,
} from 'lucide-react';
import { openAlertsDrawer } from '../lib/alertsStore';

interface Props {
  balance?: string;
  alerts?: number;
}

const PRIMARY = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
  { path: '/analytics', label: 'Analytics', icon: PieChart },
  { path: '/goals', label: 'Planning', icon: Target },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const SECONDARY = [
  { path: '/budget', label: 'Budget', icon: Wallet },
  { path: '/budget-pace', label: 'Budget Pace', icon: Activity },
  { path: '/savings-rate', label: 'Savings', icon: TrendingUp },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/runway', label: 'Runway', icon: Shield },
  { path: '/credit-card', label: 'Credit', icon: CreditCard },
];

const ANALYTICS = [
  { path: '/streaks', label: 'Streaks', icon: Zap },
  { path: '/achievements', label: 'Achievements', icon: Trophy },
  { path: '/health', label: 'Health Score', icon: Heart },
  { path: '/spending-mix', label: 'Spending Mix', icon: Layers },
  { path: '/spending-rhythm', label: 'Rhythm', icon: BarChart3 },
  { path: '/dna', label: 'Spending DNA', icon: FlaskConical },
  { path: '/matrix', label: 'Category Matrix', icon: Grid3x3 },
  { path: '/merchants', label: 'Merchants', icon: Search },
];

const PLANNING = [
  { path: '/fire', label: 'FIRE', icon: Flame },
  { path: '/what-if', label: 'What-If', icon: FlaskConical },
  { path: '/forecast', label: 'Forecast', icon: TrendingUp },
  { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { path: '/networth', label: 'Net Worth', icon: PiggyBank },
];

const REPORTS = [
  { path: '/weekly', label: 'Weekly', icon: Calendar },
  { path: '/report', label: 'Monthly', icon: FileText },
  { path: '/yearly', label: 'Yearly', icon: CalendarDays },
  { path: '/compare', label: 'Compare', icon: GitCompare },
  { path: '/cashflow', label: 'Cashflow', icon: BarChart3 },
  { path: '/recurring', label: 'Recurring', icon: Repeat },
  { path: '/recurring-audit', label: 'Recurring Audit', icon: Search },
  { path: '/recommendations', label: 'Tips', icon: Trophy },
];

type NavItem = typeof PRIMARY[0];

function NavRow({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <a
      href={item.path}
      onClick={onClick}
      className={`w-full flex items-center rounded-xl px-3 py-2.5 min-h-[44px] gap-3 transition-all duration-150 no-underline ${
        active
          ? 'text-slate-900 dark:text-white'
          : 'text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5'
      }`}
      style={
        active
          ? { background: 'rgba(52, 211, 153, 0.12)', boxShadow: '0 0 20px rgba(52, 211, 153, 0.08)' }
          : undefined
      }
    >
      {React.createElement(item.icon, {
        className: `w-5 h-5 shrink-0 ${active ? 'text-mint-500' : ''}`,
        strokeWidth: 1.8,
      })}
      <span className="text-sm font-medium">{item.label}</span>
      {active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#34d399' }} />
      )}
    </a>
  );
}

function GroupHeader({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
      {label}
    </p>
  );
}


// KUR-245 G1 — badge discipline on the notification surface: the numeric
// badge counts ONLY severity HIGH (OVER); APPROACHING-only shows a gold dot;
// INFO alone never badges. aria-label always speaks the full breakdown.
const SEV = { over: 0, approaching: 0, info: 0 };
type Sev = typeof SEV;

function useAlertBadge(initialAlerts: number) {
  const [counts, setCounts] = useState({ total: initialAlerts, ...SEV });

  useEffect(() => {
    const syncCount = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      if (typeof n === 'number' && n >= 0) {
        setCounts((c) => ({ ...c, total: n }));
      }
    };
    const syncSev = (e: Event) => {
      const d = (e as CustomEvent<Sev>).detail;
      if (d && typeof d.over === 'number') {
        setCounts({ total: d.over + d.approaching + d.info, ...d });
      }
    };
    window.addEventListener('alerts-count', syncCount);
    window.addEventListener('alerts-severity', syncSev);
    return () => {
      window.removeEventListener('alerts-count', syncCount);
      window.removeEventListener('alerts-severity', syncSev);
    };
  }, []);

  // Badge spec: numeric (coral) = count(OVER) capped at "9+"; gold dot when
  // 0 OVER but APPROACHING exists; nothing for INFO-only. No pulse animation.
  const badge =
    counts.over > 0
      ? { kind: 'count' as const, label: counts.over > 9 ? '9+' : String(counts.over) }
      : counts.approaching > 0
        ? { kind: 'dot' as const, label: '' }
        : { kind: 'none' as const, label: '' };
  const aria = counts.total > 0
    ? `Alerts, ${counts.over} over, ${counts.approaching} nearing, ${counts.info} info`
    : 'Alerts, none';
  return { counts, badge, aria };
}

export default function MobileSidebar({ balance, alerts: initialAlerts = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const bell = useAlertBadge(initialAlerts);
  const bellRef = useRef<HTMLButtonElement | null>(null);

  // Mirror drawer open/close for aria-expanded on the bell (KUR-117 §5).
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    const sync = (e: Event) =>
      setDrawerOpen(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener('fin-alerts-drawer-state', sync);
    return () => window.removeEventListener('fin-alerts-drawer-state', sync);
  }, []);

  // Hydration-safe current path: SSR renders '/', client sets real path after mount.
  const [currentPath, setCurrentPath] = useState('/');
  useEffect(() => {
    setCurrentPath(window.location.pathname.replace(/\/$/, '') || '/');
  }, []);

  const isActive = (path: string) => currentPath === path;

  // Expose toggle function globally so Layout.astro hamburger button can call it
  useEffect(() => {
    (window as any).__toggleMobileSidebar = () => setOpen(true);
    return () => { delete (window as any).__toggleMobileSidebar; };
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        className={`lg:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-[70] w-[280px] flex flex-col glass-nav transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        {/* FIN-024: header padding clears the status-bar inset when cover is active */}
        <div className="flex items-center min-h-[3.5rem] px-4 shrink-0 border-b border-slate-200 dark:border-white/[0.05]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <a href="/" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 no-underline" style={{ background: 'linear-gradient(135deg, #34d399, #0ea5e9)' }}>
            <span className="text-slate-900 dark:text-white font-bold text-xs">FD</span>
          </a>
          <span className="ml-3 font-semibold text-slate-900 dark:text-white text-base">FinDash</span>
          <button
            onClick={close}
            className="ml-auto flex items-center justify-center w-11 h-11 rounded-lg hover:bg-slate-200/50 dark:bg-white/10 transition-colors text-slate-600 dark:text-white/50"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance snippet */}
        {balance && (
          <div className="px-4 py-4 shrink-0 border-b border-slate-200 dark:border-white/[0.05]">
            <p className="text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider mb-1">Balance</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{balance}</p>
          </div>
        )}

        {/* Nav, scrollable */}
        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto sidebar-scroll">
          {PRIMARY.map((item) => (
            <NavRow key={item.path} item={item} active={isActive(item.path)} onClick={close} />
          ))}
          <div className="my-2 border-t border-slate-200 dark:border-white/[0.05] mx-3" />
          {SECONDARY.map((item) => (
            <NavRow key={item.path} item={item} active={isActive(item.path)} onClick={close} />
          ))}

          <GroupHeader label="Analytics" />
          {ANALYTICS.map((item) => (
            <NavRow key={item.path} item={item} active={isActive(item.path)} onClick={close} />
          ))}

          <GroupHeader label="Planning" />
          {PLANNING.map((item) => (
            <NavRow key={item.path} item={item} active={isActive(item.path)} onClick={close} />
          ))}

          <GroupHeader label="Reports" />
          {REPORTS.map((item) => (
            <NavRow key={item.path} item={item} active={isActive(item.path)} onClick={close} />
          ))}
        </nav>

        {/* Alert bell — opens the Alerts Detail Drawer (FIN-021). KUR-117 §6:
            stays clickable at 0 alerts (reassurance + discoverability). */}
        <div className="px-3 pt-2 shrink-0 border-t border-slate-200 dark:border-white/[0.05]" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <button
            type="button"
            ref={bellRef}
            onClick={() => {
              close();
              openAlertsDrawer(bellRef.current);
            }}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            aria-label={bell.aria}
            className="relative w-full flex items-center min-h-[44px] rounded-xl px-3 py-2 gap-3 transition-colors no-underline hover:bg-slate-100 dark:bg-white/5"
          >
            <Bell
              className={`w-5 h-5 ${bell.badge.kind !== 'none' ? 'text-mint-500' : 'text-slate-500 dark:text-white/50'}`}
              strokeWidth={1.8}
            />
            <span className={`text-sm ${bell.badge.kind !== 'none' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/50'}`}>
              {bell.counts.total > 0 ? `${bell.counts.total} alert${bell.counts.total !== 1 ? 's' : ''}` : 'No alerts'}
            </span>
            {bell.badge.kind === 'count' && (
              <span
                aria-hidden="true"
                className="ml-auto min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center bg-coral-500 text-white text-[11px] font-bold"
              >
                {bell.badge.label}
              </span>
            )}
            {bell.badge.kind === 'dot' && (
              <span
                aria-hidden="true"
                className="ml-auto w-2 h-2 rounded-full bg-gold-500"
              />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
