import React, { useMemo } from 'react';
import { LayoutDashboard, ArrowRightLeft, PieChart, Target, Plus } from 'lucide-react';

const TABS = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/transactions', label: 'Txns', icon: ArrowRightLeft },
  { path: '/analytics', label: 'Analytics', icon: PieChart },
  { path: '/goals', label: 'Planning', icon: Target },
];

function openQuickAdd() {
  window.dispatchEvent(new CustomEvent('quick-add-open'));
}

export default function FintechBottomTabs() {
  const currentPath = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname.replace(/\/$/, '') || '/';
  }, []);

  return (
    <nav
      className="lg:hidden fixed bottom-4 left-4 right-4 rounded-2xl flex items-center justify-around py-2 z-50"
      style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map((tab, idx) => {
        // Insert center + button between 2nd and 3rd tabs
        if (idx === 2) {
          return (
            <React.Fragment key="center-btn">
              {/* Center + button — opens QuickAddDialog */}
              <button
                onClick={openQuickAdd}
                className="flex items-center justify-center w-12 h-12 rounded-full -mt-6 shrink-0 mx-0.5 transition-transform active:scale-90 border-0 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #34d399, #0ea5e9)' }}
                aria-label="Quick add transaction"
              >
                <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
              </button>
              {/* 3rd tab */}
              <TabButton tab={tab} active={currentPath === tab.path} />
            </React.Fragment>
          );
        }
        return (
          <TabButton
            key={tab.path}
            tab={tab}
            active={currentPath === tab.path}
          />
        );
      })}
    </nav>
  );
}

function TabButton({ tab, active }: { tab: typeof TABS[0]; active: boolean }) {
  return (
    <a
      href={tab.path}
      className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors relative no-underline flex-1"
    >
      {React.createElement(tab.icon, {
        className: 'w-5 h-5',
        strokeWidth: 1.8,
        style: { color: active ? '#34d399' : 'rgba(255,255,255,0.3)' },
      })}
      <span
        className="text-[10px] font-medium"
        style={{ color: active ? '#34d399' : 'rgba(255,255,255,0.3)' }}
      >
        {tab.label}
      </span>
      {active && (
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
          style={{ backgroundColor: '#34d399' }}
        />
      )}
    </a>
  );
}
