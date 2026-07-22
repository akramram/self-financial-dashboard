import React, { useMemo } from 'react';
import { LayoutDashboard, ArrowRightLeft, PieChart, Target, Settings } from 'lucide-react';

const TABS = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/transactions', label: 'Txns', icon: ArrowRightLeft },
  { path: '/analytics', label: 'Analytics', icon: PieChart },
  { path: '/goals', label: 'Planning', icon: Target },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function FintechBottomTabs() {
  const currentPath = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname.replace(/\/$/, '') || '/';
  }, []);

  return (
    <nav
      className="lg:hidden fixed bottom-4 left-4 right-4 rounded-2xl flex items-center justify-around py-2 px-2 z-50"
      style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      }}
    >
      {TABS.map((tab) => {
        const active = currentPath === tab.path;
        return (
          <a
            key={tab.path}
            href={tab.path}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors relative no-underline flex-1"
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
      })}
    </nav>
  );
}
