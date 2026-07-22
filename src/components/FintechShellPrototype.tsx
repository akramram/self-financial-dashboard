import React, { useState } from 'react';
import {
  LayoutDashboard, ArrowRightLeft, PieChart, Target, Settings,
  TrendingUp, Calendar, Shield, Wallet, CreditCard, Menu, X, Plus,
  Bell
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: LayoutDashboard, active: true },
  { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
  { id: 'analytics', label: 'Analytics', icon: PieChart },
  { id: 'planning', label: 'Planning', icon: Target },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const SECONDARY_ITEMS = [
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'savings', label: 'Savings', icon: TrendingUp },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'runway', label: 'Runway', icon: Shield },
  { id: 'credit', label: 'Credit', icon: CreditCard },
];

export default function FintechShellPrototype() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [alerts, setAlerts] = useState(3);

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#0a0e27' }}>
      {/* ============ DESKTOP SIDEBAR ============ */}
      <aside
        className={`
          hidden lg:flex flex-col h-full transition-all duration-300 ease-out
          ${collapsed ? 'w-[72px]' : 'w-[240px]'}
        `}
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #00d4aa, #0ea5e9)' }}>
            <span className="text-white font-bold text-sm">FD</span>
          </div>
          {!collapsed && (
            <span className="ml-3 font-semibold text-white text-base">
              FinDash
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <Menu className="w-4 h-4 text-white/50" />
            ) : (
              <X className="w-4 h-4 text-white/50" />
            )}
          </button>
        </div>

        {/* Balance snippet */}
        <div className={`px-4 py-4 border-b border-white/5 ${collapsed ? 'hidden' : ''}`}>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Balance</p>
          <p className="text-lg font-bold text-white">Rp 4.2M</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs font-semibold" style={{ color: '#00d4aa' }}>+12%</span>
            <span className="text-xs text-white/30">vs last month</span>
          </div>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                w-full flex items-center rounded-xl transition-all duration-150
                ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5 gap-3'}
                ${activeTab === item.id ? 'text-white' : 'text-white/40 hover:text-white/70'}
              `}
              style={activeTab === item.id ? {
                background: 'rgba(0, 212, 170, 0.12)',
                boxShadow: '0 0 20px rgba(0, 212, 170, 0.08)'
              } : {}}
            >
              {React.createElement(item.icon, { className: 'w-5 h-5 shrink-0', strokeWidth: 1.8 })}
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              {!collapsed && activeTab === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00d4aa' }} />
              )}
            </button>
          ))}
        </nav>

        {/* Secondary links */}
        <div className={`px-2 pb-2 ${collapsed ? 'hidden' : ''}`}>
          <p className="px-3 py-2 text-xs text-white/20 uppercase tracking-wider">More</p>
          {SECONDARY_ITEMS.map((item) => (
            <button
              key={item.id}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/30 hover:text-white/60 transition-colors"
            >
              {React.createElement(item.icon, { className: 'w-4 h-4', strokeWidth: 1.5 })}
              {item.label}
            </button>
          ))}
        </div>

        {/* User */}
        <div className={`p-3 border-t border-white/5 ${collapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}>
          <div className="w-8 h-8 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg, #ff6b6b, #ffd700)' }} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Akram</p>
              <p className="text-xs text-white/30 truncate">Admin</p>
            </div>
          )}
        </div>
      </aside>

      {/* ============ MAIN CONTENT ============ */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar (desktop) */}
        <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b border-white/5">
          <div>
            <h1 className="text-lg font-bold text-white">Dashboard</h1>
            <p className="text-xs text-white/30">July 2026 · Day 2 of 30</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Alert bell */}
            <button className="relative p-2 rounded-xl hover:bg-white/10 transition-colors" style={{ color: alerts > 0 ? '#00d4aa' : 'rgba(255,255,255,0.3)' }}>
              <Bell className="w-5 h-5" strokeWidth={1.8} />
              {alerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: '#ff6b6b' }}>
                  {alerts}
                </span>
              )}
            </button>
            {/* Quick add */}
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #00d4aa, #0ea5e9)' }}>
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            {/* Balance Hero */}
            <div className="sm:col-span-4 p-6 rounded-2xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,170,0.15), rgba(14,165,233,0.1))',
                border: '1px solid rgba(0,212,170,0.15)',
                backdropFilter: 'blur(20px)',
              }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/50 mb-1">Available Balance</p>
                  <p className="text-3xl font-bold text-white">Rp 4,200,000</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,212,170,0.15)', color: '#00d4aa' }}>
                      +12%
                    </span>
                    <span className="text-xs text-white/30">vs last month</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Glance chips */}
            {[{ label: 'Income', value: 'Rp 15M', color: '#00d4aa' }, { label: 'Spent', value: 'Rp 10.8M', color: '#ff6b6b' }, { label: 'Net Worth', value: 'Rp 31.5M', color: '#ffd700' }].map((chip) => (
              <div key={chip.label} className="p-4 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(10px)',
                }}>
                <p className="text-xs text-white/30 mb-1">{chip.label}</p>
                <p className="text-lg font-bold text-white mb-1">{chip.value}</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold" style={{ color: chip.color }}>+5%</span>
                  <span className="text-[10px] text-white/20">Δ</span>
                </div>
              </div>
            ))}
          </div>

          {/* Widget placeholder cards */}
          {['Spending Pulse', 'Category Breakdown', 'Credit Snapshot', 'Recent Transactions'].map((title) => (
            <div key={title} className="mb-4 p-6 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
              <p className="text-sm text-white/30">{title}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ============ MOBILE BOTTOM TABS ============ */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 rounded-2xl flex items-center justify-around py-2 px-2 z-50"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.5)'
        }}>
        {['home', 'transactions', 'analytics', 'planning', 'settings'].map((id) => {
          const item = [...NAV_ITEMS, ...SECONDARY_ITEMS].find(i => i.id === id) || NAV_ITEMS[0];
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors relative"
            >
              {React.createElement(item.icon, {
                className: 'w-5 h-5',
                strokeWidth: 1.8,
                style: { color: activeTab === id ? '#00d4aa' : 'rgba(255,255,255,0.3)' }
              })}
              <span className="text-[10px] font-medium"
                style={{ color: activeTab === id ? '#00d4aa' : 'rgba(255,255,255,0.3)' }}>
                {item.label}
              </span>
              {activeTab === id && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: '#00d4aa' }} />
              )}
            </button>
          );
        })}
      </nav>
      {/* Mobile bottom padding for tab bar */}
      <div className="lg:hidden h-20" />

      {/* ============ MOBILE TOP BAR ============ */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40"
        style={{
          background: 'rgba(10, 14, 39, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #00d4aa, #0ea5e9)' }}>
          <span className="text-white font-bold text-xs">FD</span>
        </div>
        <h1 className="text-sm font-bold text-white">FinDash</h1>
        <div className="flex items-center gap-2">
          <button className="relative p-1.5 rounded-lg">
            <Bell className="w-4 h-4" style={{ color: alerts > 0 ? '#00d4aa' : 'rgba(255,255,255,0.3)' }} strokeWidth={1.8} />
            {alerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: '#ff6b6b' }}>
                {alerts}
              </span>
            )}
          </button>
        </div>
      </div>
      <div className="lg:hidden h-14" />
    </div>
  );
}
