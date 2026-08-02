import React, { useMemo } from 'react';
import { Clock, AlertTriangle, TrendingUp } from 'lucide-react';

interface PeriodProgressRingProps {
  /** Month label from periods table, e.g. "August 2026" */
  activeMonth?: string;
  /** Optional class for the wrapper */
  className?: string;
}

interface PeriodInfo {
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  pctElapsed: number;
  status: 'early' | 'mid' | 'late';
  label: string;
}

function getPeriodInfo(activeMonth?: string): PeriodInfo {
  const now = new Date();
  const today = now.getDate();

  // Try to compute from the month label
  let start: Date;
  let end: Date;

  if (activeMonth) {
    const parts = activeMonth.split(' ');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthIdx = monthNames.indexOf(parts[0]);
    const year = parseInt(parts[1] || String(now.getFullYear()), 10);

    if (monthIdx >= 0) {
      // Period starts on 21st of previous month, ends on 20th of named month
      const startMonth = monthIdx === 0 ? 11 : monthIdx - 1;
      const startYear = monthIdx === 0 ? year - 1 : year;
      start = new Date(startYear, startMonth, 21);
      end = new Date(year, monthIdx, 20, 23, 59, 59);
    } else {
      // Fallback: current salary period
      start = new Date(now.getFullYear(), now.getMonth(), today >= 21 ? now.getMonth() : now.getMonth() - 1, 21);
      end = new Date(now.getFullYear(), today >= 21 ? now.getMonth() + 1 : now.getMonth(), 20, 23, 59, 59);
    }
  } else {
    // Fallback: current salary period
    start = new Date(now.getFullYear(), now.getMonth(), today >= 21 ? now.getMonth() : now.getMonth() - 1, 21);
    end = new Date(now.getFullYear(), today >= 21 ? now.getMonth() + 1 : now.getMonth(), 20, 23, 59, 59);
  }

  const msPerDay = 86400000;
  const daysTotal = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay));
  const daysElapsed = Math.max(0, Math.min(daysTotal, Math.round((now.getTime() - start.getTime()) / msPerDay)));
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);
  const pctElapsed = Math.min(100, Math.round((daysElapsed / daysTotal) * 100));

  let status: 'early' | 'mid' | 'late';
  if (pctElapsed < 50) status = 'early';
  else if (pctElapsed < 80) status = 'mid';
  else status = 'late';

  const label = `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`;

  return { daysElapsed, daysTotal, daysRemaining, pctElapsed, status, label };
}

/**
 * A small SVG ring that shows salary period time progress.
 * Displays how many days remain in the current salary period (21st → 20th).
 * Placed inside the Balance Hero on the Dashboard.
 */
export default function PeriodProgressRing({ activeMonth, className = '' }: PeriodProgressRingProps) {
  const info = useMemo(() => getPeriodInfo(activeMonth), [activeMonth]);

  // SVG ring dimensions
  const size = 52;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (info.pctElapsed / 100) * circumference;

  // Colors based on status
  const colorMap = {
    early: { ring: '#34d399', bg: 'rgba(52,211,153,0.12)', text: 'text-mint-500' },
    mid: { ring: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: 'text-gold-500' },
    late: { ring: '#ef4444', bg: 'rgba(239,68,68,0.12)', text: 'text-coral-500' },
  };
  const colors = colorMap[info.status];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* SVG Ring */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-white/[0.08]"
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[10px] font-bold ${colors.text}`} style={{ color: colors.ring }}>
            {info.pctElapsed}%
          </span>
        </div>
      </div>

      {/* Label */}
      <div>
        <p className="text-xs font-medium text-slate-700 dark:text-white/70 flex items-center gap-1">
          <Clock className="w-3 h-3" style={{ color: colors.ring }} />
          {info.label}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-white/30">
          Day {info.daysElapsed} of {info.daysTotal}
        </p>
      </div>
    </div>
  );
}
