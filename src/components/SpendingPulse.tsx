import React, { useMemo } from 'react';
import type { MonthlySummary } from '../lib/data';
import { formatIdr } from '../lib/utils';
import { Activity, Clock, TrendingDown, TrendingUp, Gauge, CreditCard } from 'lucide-react';

interface Props {
  summaries: MonthlySummary[];
  activeMonth: string;
}

interface PulseData {
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  pctTimeElapsed: number;
  dailyBudget: number;
  expectedSpend: number;
  actualSpend: number;
  pacePct: number;
  projectedTotal: number;
  status: 'under' | 'on-track' | 'over';
  income: number;
  cash: number;
  credit: number;
}

function getPeriodDates(activeMonth: string): { start: Date; end: Date } {
  // Period is named after the month it ends in.
  // It starts on the 21st of the PREVIOUS month and ends on the 20th of the named month.
  const parts = activeMonth.split(' ');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthIdx = monthNames.indexOf(parts[0]);
  const year = parseInt(parts[1] || String(new Date().getFullYear()), 10);

  if (monthIdx < 0) {
    // Fallback
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 21),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 20),
    };
  }

  // Start: 21st of previous month
  const startMonth = monthIdx === 0 ? 11 : monthIdx - 1;
  const startYear = monthIdx === 0 ? year - 1 : year;
  const start = new Date(startYear, startMonth, 21);

  // End: 20th of named month
  const end = new Date(year, monthIdx, 20, 23, 59, 59, 999);

  return { start, end };
}

export default function SpendingPulse({ summaries, activeMonth }: Props) {
  const pulse = useMemo((): PulseData | null => {
    const summary = summaries.find((s) => s.month === activeMonth);
    if (!summary) return null;

    const income = summary.income ?? 0;
    if (income <= 0) return null;

    const { start, end } = getPeriodDates(activeMonth);
    const now = new Date();

    // Clamp to period boundaries
    const effectiveNow = now < start ? start : now > end ? end : now;

    const daysTotal = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysElapsed = Math.max(1, Math.ceil((effectiveNow.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const daysRemaining = Math.max(0, daysTotal - daysElapsed);

    const pctTimeElapsed = Math.min(100, (daysElapsed / daysTotal) * 100);
    const dailyBudget = income / daysTotal;
    const expectedSpend = dailyBudget * daysElapsed;
    const actualSpend = summary.outcome?.total ?? 0;
    const cash = summary.outcome?.cash ?? 0;
    const credit = summary.outcome?.credit_payment ?? 0;
    const pacePct = expectedSpend > 0 ? (actualSpend / expectedSpend) * 100 : 0;
    const projectedTotal = daysElapsed > 0 ? (actualSpend / daysElapsed) * daysTotal : 0;

    let status: PulseData['status'] = 'on-track';
    if (pacePct < 90) status = 'under';
    else if (pacePct > 110) status = 'over';

    return {
      daysElapsed,
      daysTotal,
      daysRemaining,
      pctTimeElapsed,
      dailyBudget,
      expectedSpend,
      actualSpend,
      pacePct,
      projectedTotal,
      status,
      income,
      cash,
      credit,
    };
  }, [summaries, activeMonth]);

  if (!pulse) return null;

  const statusConfig = {
    'under': {
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      bar: 'bg-emerald-500',
      track: 'bg-emerald-100 dark:bg-emerald-800/50',
      icon: <TrendingDown className="w-5 h-5" />,
      label: 'Spending slower than expected',
      badge: 'Under Pace',
    },
    'on-track': {
      color: 'text-gold-600 dark:text-gold-400',
      bg: 'bg-gold-500/5 dark:bg-gold-700/20/20',
      border: 'border-gold-400/20 dark:border-gold-700/40',
      bar: 'bg-gold-500/50',
      track: 'bg-gold-500/10 dark:bg-gold-700/20/50',
      icon: <Activity className="w-5 h-5" />,
      label: 'Spending on pace with the period',
      badge: 'On Track',
    },
    'over': {
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      bar: 'bg-red-500',
      track: 'bg-red-100 dark:bg-red-800/50',
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Spending faster than expected',
      badge: 'Over Pace',
    },
  };

  const cfg = statusConfig[pulse.status];

  // SVG gauge dimensions
  const gaugeRadius = 70;
  const gaugeStroke = 10;
  const gaugeCenter = 80;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  // Gauge arc: 180 degrees (semi-circle), starts at 180 deg (left), ends at 360 deg (right)
  const gaugeArcLength = gaugeCircumference * 0.5;

  // Map pacePct to angle (0% = left, 100% = middle, 200% = right). Clamp to 0-200.
  const clampedPace = Math.max(0, Math.min(200, pulse.pacePct));
  const gaugePct = clampedPace / 200; // 0 to 1 over the semi-circle
  const gaugeOffset = gaugeArcLength * (1 - gaugePct);

  const gaugeColor = pulse.status === 'under' ? '#10b981' : pulse.status === 'on-track' ? '#f59e0b' : '#ef4444';

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 relative overflow-hidden`}>
      {/* Subtle color bar at top */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${cfg.bar}`} />

      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left: Text info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <Gauge className={`w-5 h-5 ${cfg.color}`} />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Spending Pulse
            </h3>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} border ${cfg.border} ${cfg.color}`}>
              {cfg.badge}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {cfg.label} — you've spent {pulse.pacePct.toFixed(0)}% of the expected amount for this point in the period.
          </p>

          {/* Key metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-200 dark:bg-slate-800/60 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5" />
                Time Elapsed
              </div>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                Day {pulse.daysElapsed} of {pulse.daysTotal}
              </p>
              <p className="text-xs text-slate-500">{pulse.pctTimeElapsed.toFixed(0)}% through period</p>
            </div>
            <div className="bg-slate-200 dark:bg-slate-800/60 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Activity className="w-3.5 h-3.5" />
                Spend vs Expected
              </div>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                {formatIdr(pulse.actualSpend)}
              </p>
              <p className="text-xs text-slate-500">
                Expected: {formatIdr(pulse.expectedSpend)}
              </p>
            </div>
            {(pulse.cash > 0 || pulse.credit > 0) && (
              <div className="bg-slate-200 dark:bg-slate-800/60 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  Cash vs Credit
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-mint-500 dark:text-mint-400">
                    {formatIdr(pulse.cash)}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">/</span>
                  <span className="text-sm font-semibold text-gold-600 dark:text-gold-400">
                    {formatIdr(pulse.credit)}
                  </span>
                </div>
                <div className="flex gap-0.5 text-[10px] text-slate-500 mb-1">
                  <span className="text-mint-500">● Cash</span>
                  <span className="text-gold-500 ml-1">● Credit</span>
                </div>
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden flex">
                  <div
                    className="bg-mint-500/30 h-1.5 rounded-l-full transition-all"
                    style={{ width: `${(pulse.cash / Math.max(1, pulse.cash + pulse.credit)) * 100}%` }}
                  />
                  <div
                    className="bg-gold-500/50 h-1.5 rounded-r-full transition-all"
                    style={{ width: `${(pulse.credit / Math.max(1, pulse.cash + pulse.credit)) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Projected total */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Projected period total:</span>
            <span className={`font-semibold ${pulse.projectedTotal > pulse.income ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatIdr(pulse.projectedTotal)}
            </span>
            <span>vs</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{formatIdr(pulse.income)}</span>
            <span>income</span>
          </div>
        </div>

        {/* Right: SVG Gauge */}
        <div className="shrink-0 flex flex-col items-center">
          <svg width="160" height="110" viewBox="0 0 160 110">
            {/* Background track (semi-circle) */}
            <path
              d={`M ${gaugeCenter - gaugeRadius} ${gaugeCenter} A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${gaugeCenter + gaugeRadius} ${gaugeCenter}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={gaugeStroke}
              className="text-slate-200 dark:text-slate-600"
              strokeLinecap="round"
            />
            {/* Active gauge arc */}
            <path
              d={`M ${gaugeCenter - gaugeRadius} ${gaugeCenter} A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${gaugeCenter + gaugeRadius} ${gaugeCenter}`}
              fill="none"
              stroke={gaugeColor}
              strokeWidth={gaugeStroke}
              strokeLinecap="round"
              strokeDasharray={`${gaugeArcLength} ${gaugeCircumference}`}
              strokeDashoffset={gaugeOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
            {/* Center label */}
            <text x={gaugeCenter} y={gaugeCenter - 15} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500" style={{ fontSize: '11px' }}>
              PACE
            </text>
            <text x={gaugeCenter} y={gaugeCenter + 12} textAnchor="middle" className="fill-slate-800 dark:fill-slate-100" style={{ fontSize: '22px', fontWeight: 'bold' }}>
              {pulse.pacePct.toFixed(0)}%
            </text>
            {/* Left label */}
            <text x={gaugeCenter - gaugeRadius} y={gaugeCenter + 22} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500" style={{ fontSize: '10px' }}>
              0%
            </text>
            {/* Right label */}
            <text x={gaugeCenter + gaugeRadius} y={gaugeCenter + 22} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500" style={{ fontSize: '10px' }}>
              200%
            </text>
          </svg>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            % of expected spend
          </p>
        </div>
      </div>

      {/* Bottom: mini progress comparing time vs spend */}
      <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-16 text-slate-500 dark:text-slate-400 shrink-0">Time</span>
          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-mint-400 dark:bg-mint-500/30 h-1.5 rounded-full transition-all"
              style={{ width: `${pulse.pctTimeElapsed}%` }}
            />
          </div>
          <span className="w-10 text-right font-medium text-slate-600 dark:text-slate-300">{pulse.pctTimeElapsed.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-16 text-slate-500 dark:text-slate-400 shrink-0">Spend</span>
          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${cfg.bar}`}
              style={{ width: `${Math.min(100, (pulse.actualSpend / pulse.income) * 100)}%` }}
            />
          </div>
          <span className="w-10 text-right font-medium text-slate-600 dark:text-slate-300">
            {((pulse.actualSpend / pulse.income) * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-16 text-slate-500 dark:text-slate-400 shrink-0">Budget</span>
          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                (pulse.actualSpend / pulse.income) * 100 < 50
                  ? 'bg-emerald-500'
                  : (pulse.actualSpend / pulse.income) * 100 <= 80
                    ? 'bg-gold-500/50'
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, (pulse.actualSpend / pulse.income) * 100)}%` }}
            />
          </div>
          <span className={`w-10 text-right font-medium ${
            (pulse.actualSpend / pulse.income) * 100 < 50
              ? 'text-emerald-600 dark:text-emerald-400'
              : (pulse.actualSpend / pulse.income) * 100 <= 80
                ? 'text-gold-600 dark:text-gold-400'
                : 'text-red-600 dark:text-red-400'
          }`}>
            {((pulse.actualSpend / pulse.income) * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
