import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LayoutDashboard, ArrowRightLeft, PieChart, Target, Settings,
  TrendingUp, Calendar, Shield, Wallet, CreditCard, Menu, X, Bell,
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

export default function FintechSidebar({ balance, alerts: initialAlerts = 0 }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const bell = useAlertBadge(initialAlerts);
  const bellRef = useRef<HTMLButtonElement | null>(null);

  // Keep layout offsets (topbar margin, main padding) in sync with width
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? '72px' : '240px');
  }, [collapsed]);

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

  const NavButton = ({ item, isPrimary }: { item: typeof PRIMARY[0]; isPrimary: boolean }) => (
    <a
      href={item.path}
      className={`
        w-full flex items-center rounded-xl transition-all duration-150 no-underline
        ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5 gap-3'}
        ${isActive(item.path) ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5'}
      `}
      style={
        isActive(item.path)
          ? {
              background: 'rgba(52, 211, 153, 0.12)',
              boxShadow: '0 0 20px rgba(52, 211, 153, 0.08)',
            }
          : undefined
      }
    >
      {React.createElement(item.icon, {
        className: `w-5 h-5 shrink-0 ${isActive(item.path) ? 'text-mint-500' : ''}`,
        strokeWidth: 1.8,
      })}
      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
      {!collapsed && isActive(item.path) && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#34d399' }} />
      )}
    </a>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        id="fintech-sidebar"
        className={`
          hidden lg:flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-out
          glass-nav
          ${collapsed ? 'w-[72px]' : 'w-[240px]'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 shrink-0 border-b border-slate-200 dark:border-white/[0.05]">
          <a href="/" className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 no-underline"
            style={{ background: 'linear-gradient(135deg, #34d399, #0ea5e9)' }}>
            <span className="text-slate-900 dark:text-white font-bold text-sm">FD</span>
          </a>
          {!collapsed && <span className="ml-3 font-semibold text-slate-900 dark:text-white text-base">FinDash</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1.5 rounded-lg hover:bg-slate-200/50 dark:bg-white/10 transition-colors text-slate-600 dark:text-white/50"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        {/* Balance snippet */}
        {balance && (
          <div className={`px-4 py-4 shrink-0 border-b border-slate-200 dark:border-white/[0.05] ${collapsed ? 'hidden' : ''}`}>
            <p className="text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider mb-1">Balance</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{balance}</p>
          </div>
        )}

        {/* Primary nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto sidebar-scroll">
          {PRIMARY.map((item) => (
            <NavButton key={item.path} item={item} isPrimary />
          ))}
          <div className={`my-2 border-t border-slate-200 dark:border-white/[0.05] ${collapsed ? 'mx-2' : 'mx-3'}`} />
          {SECONDARY.map((item) => (
            <NavButton key={item.path} item={item} isPrimary={false} />
          ))}

          {!collapsed && (
            <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">Analytics</p>
          )}
          {ANALYTICS.map((item) => (
            <NavButton key={item.path} item={item} isPrimary={false} />
          ))}

          {!collapsed && (
            <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">Planning</p>
          )}
          {PLANNING.map((item) => (
            <NavButton key={item.path} item={item} isPrimary={false} />
          ))}

          {!collapsed && (
            <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">Reports</p>
          )}
          {REPORTS.map((item) => (
            <NavButton key={item.path} item={item} isPrimary={false} />
          ))}
        </nav>

        {/* Alert bell — opens the Alerts Detail Drawer (FIN-021). KUR-117 §6:
            stays clickable at 0 alerts (reassurance + discoverability). */}
        <div className={`px-3 pt-2 pb-3 shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            type="button"
            ref={bellRef}
            onClick={() => openAlertsDrawer(bellRef.current)}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            aria-label={bell.aria}
            title={bell.aria}
            className={`relative w-full flex items-center min-h-[44px] rounded-xl transition-colors no-underline hover:bg-slate-100 dark:hover:bg-white/5 data-[drawer=open]:bg-slate-100 dark:data-[drawer=open]:bg-white/5 ${
              collapsed ? 'justify-center p-2' : 'px-3 py-2 gap-3'
            }`}
            data-drawer={drawerOpen ? 'open' : 'closed'}
          >
            <Bell
              className={`w-5 h-5 ${bell.badge.kind !== 'none' ? 'text-mint-500' : 'text-slate-500 dark:text-white/50'}`}
              strokeWidth={1.8}
            />
            {bell.badge.kind === 'count' && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center bg-coral-500 text-white text-[11px] font-bold"
              >
                {bell.badge.label}
              </span>
            )}
            {bell.badge.kind === 'dot' && (
              <span
                aria-hidden="true"
                className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-gold-500"
              />
            )}
            {!collapsed && (
              <span className={`text-sm ${bell.badge.kind !== 'none' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/50'}`}>
                {bell.counts.total > 0 ? `${bell.counts.total} alert${bell.counts.total !== 1 ? 's' : ''}` : 'No alerts'}
              </span>
            )}
          </button>
          {/* aria-live: announce count changes without moving focus (§5) */}
          <span aria-live="polite" className="sr-only">
            {bell.aria}
          </span>
        </div>
      </aside>

    </>
  );
}
