import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  valueComponent?: React.ReactNode;
  delta?: string;
  deltaPct?: string;
  isPositive?: boolean;
  color?: string;
  icon?: React.ReactNode;
  sparkline?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function StatCard({
  label,
  value,
  valueComponent,
  delta,
  deltaPct,
  isPositive = true,
  color = '#00d4aa',
  icon,
  sparkline,
  className,
  onClick,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative p-4 rounded-2xl transition-all duration-300',
        'bg-slate-100 dark:bg-white/[0.03] backdrop-blur-sm',
        'border border-slate-200 dark:border-white/[0.06]',
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-lg',
        'group',
        className,
      )}
      onClick={onClick}
    >
      {/* Radar glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${color}10, transparent 60%)`,
        }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Icon + Label */}
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ color }} className="shrink-0">
              {icon}
            </span>
            <p className="text-xs font-medium text-slate-500 dark:text-white/40">{label}</p>
          </div>

          {/* Value */}
          <div className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 truncate">
            {valueComponent ?? value}
          </div>

          {/* Delta */}
          {delta && (
            <div className="flex items-center gap-1" style={{ color: isPositive ? color : color }}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="text-xs font-semibold">{delta}</span>
              {deltaPct && <span className="text-[10px] opacity-50">{deltaPct}</span>}
            </div>
          )}
        </div>

        {/* Sparkline */}
        {sparkline && <div className="ml-2 shrink-0 self-end">{sparkline}</div>}
      </div>
    </div>
  );
}
