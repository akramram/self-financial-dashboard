import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, ArrowRightLeft, PieChart, Target, Settings,
  TrendingUp, Calendar, Shield, Wallet, CreditCard, Menu, X, Bell,
  Trophy, Flame, Heart, BarChart3, FlaskConical, Briefcase, PiggyBank,
  Repeat, Search, FileText, GitCompare, Activity, Layers, CalendarDays, Zap, Grid3x3,
} from 'lucide-react';

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

export default function FintechSidebar({ balance, alerts = 0 }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const currentPath = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname.replace(/\/$/, '') || '/';
  }, []);

  const isActive = (path: string) => currentPath === path;

  const NavButton = ({ item, isPrimary }: { item: typeof PRIMARY[0]; isPrimary: boolean }) => (
    <a
      href={item.path}
      className={`
        w-full flex items-center rounded-xl transition-all duration-150 no-underline
        ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5 gap-3'}
      `}
      style={
        isActive(item.path)
          ? {
              background: 'rgba(52, 211, 153, 0.12)',
              color: '#fff',
              boxShadow: '0 0 20px rgba(52, 211, 153, 0.08)',
            }
          : { color: 'rgba(255,255,255,0.4)' }
      }
    >
      {React.createElement(item.icon, {
        className: 'w-5 h-5 shrink-0',
        strokeWidth: 1.8,
        style: { color: isActive(item.path) ? '#34d399' : undefined },
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
          ${collapsed ? 'w-[72px]' : 'w-[240px]'}
        `}
        style={{
          background: 'rgba(6, 10, 24, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <a href="/" className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 no-underline"
            style={{ background: 'linear-gradient(135deg, #34d399, #0ea5e9)' }}>
            <span className="text-white font-bold text-sm">FD</span>
          </a>
          {!collapsed && <span className="ml-3 font-semibold text-white text-base">FinDash</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        {/* Balance snippet */}
        {balance && (
          <div className={`px-4 py-4 shrink-0 ${collapsed ? 'hidden' : ''}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Balance</p>
            <p className="text-lg font-bold text-white tabular-nums">{balance}</p>
          </div>
        )}

        {/* Primary nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto sidebar-scroll">
          {PRIMARY.map((item) => (
            <NavButton key={item.path} item={item} isPrimary />
          ))}
          <div className={`my-2 border-t ${collapsed ? 'mx-2' : 'mx-3'}`} style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
          {SECONDARY.map((item) => (
            <NavButton key={item.path} item={item} isPrimary={false} />
          ))}

          {!collapsed && (
            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/20">Analytics</p>
          )}
          {ANALYTICS.map((item) => (
            <NavButton key={item.path} item={item} isPrimary={false} />
          ))}

          {!collapsed && (
            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/20">Planning</p>
          )}
          {PLANNING.map((item) => (
            <NavButton key={item.path} item={item} isPrimary={false} />
          ))}

          {!collapsed && (
            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/20">Reports</p>
          )}
          {REPORTS.map((item) => (
            <NavButton key={item.path} item={item} isPrimary={false} />
          ))}
        </nav>

        {/* Alert bell */}
        <div className={`px-3 pt-2 pb-3 shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
          <a
            href="/"
            className={`relative flex items-center rounded-xl transition-colors hover:bg-white/5 no-underline ${collapsed ? 'p-2 justify-center' : 'px-3 py-2 gap-3'}`}
          >
            <Bell
              className="w-5 h-5"
              strokeWidth={1.8}
              style={{ color: alerts > 0 ? '#34d399' : 'rgba(255,255,255,0.3)' }}
            />
            {alerts > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: '#ef4444' }}
              >
                {alerts}
              </span>
            )}
            {!collapsed && (
              <span className="text-sm" style={{ color: alerts > 0 ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                {alerts > 0 ? `${alerts} alert${alerts !== 1 ? 's' : ''}` : 'No alerts'}
              </span>
            )}
          </a>
        </div>
      </aside>

      {/* Sidebar spacer for desktop layout */}
      <div id="sidebar-spacer" className={`hidden lg:block transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[240px]'}`} />
    </>
  );
}
