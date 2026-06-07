import React, { useMemo } from 'react';
import type { MonthlySummary, NetworthRecord } from '../lib/data';
import { formatIdr } from '../lib/utils';
import Sparkline from './Sparkline';
import { TrendingUp, TrendingDown, DollarSign, Wallet, PiggyBank, BarChart3 } from 'lucide-react';

interface Props {
  summaries: MonthlySummary[];
  networth: NetworthRecord[];
  activeMonth: string;
}

interface MetricCard {
  label: string;
  value: string;
  delta: string;
  deltaPct: string;
  isPositive: boolean;
  sparklineData: number[];
  color: string;
  icon: React.ReactNode;
}

export default function DashboardSummaryCards({ summaries, networth, activeMonth }: Props) {
  const cards = useMemo(() => {
    const result: MetricCard[] = [];

    // Sort summaries by date ascending
    const sorted = [...summaries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Get last 6 months for sparklines
    const last6 = sorted.slice(-6);
    const months = last6.map((s) => s.month);

    const currentIdx = sorted.findIndex((s) => s.month === activeMonth);
    const currentSummary = currentIdx >= 0 ? sorted[currentIdx] : sorted[sorted.length - 1];
    const prevSummary = currentIdx > 0 ? sorted[currentIdx - 1] : null;

    // Sort networth by date
    const nwSorted = [...networth].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const nwLast6 = nwSorted.slice(-6);
    const nwCurrent = nwSorted.find((n) => n.month === activeMonth) ?? nwSorted[nwSorted.length - 1];
    const nwPrevIdx = nwSorted.findIndex((n) => n.month === activeMonth);
    const nwPrev = nwPrevIdx > 0 ? nwSorted[nwPrevIdx - 1] : null;

    // ── 1. Income ──
    if (currentSummary) {
      const income = currentSummary.income ?? 0;
      const prevIncome = prevSummary?.income ?? 0;
      const incomeDelta = income - prevIncome;
      const incomeDeltaPct = prevIncome > 0 ? (incomeDelta / prevIncome) * 100 : income > 0 ? 100 : 0;

      result.push({
        label: 'Income',
        value: formatIdr(income),
        delta: incomeDelta >= 0 ? `+${formatIdr(incomeDelta)}` : formatIdr(incomeDelta),
        deltaPct: incomeDeltaPct >= 0 ? `+${incomeDeltaPct.toFixed(1)}%` : `${incomeDeltaPct.toFixed(1)}%`,
        isPositive: incomeDelta >= 0,
        sparklineData: last6.map((s) => s.income ?? 0),
        color: '#10b981',
        icon: <DollarSign className="w-5 h-5" />,
      });
    }

    // ── 2. Outcome (Spending) ──
    if (currentSummary) {
      const outcome = currentSummary.outcome?.total ?? 0;
      const prevOutcome = prevSummary?.outcome?.total ?? 0;
      const outcomeDelta = outcome - prevOutcome;
      const outcomeDeltaPct = prevOutcome > 0 ? (outcomeDelta / prevOutcome) * 100 : outcome > 0 ? 100 : 0;

      result.push({
        label: 'Spending',
        value: formatIdr(outcome),
        delta: outcomeDelta >= 0 ? `+${formatIdr(outcomeDelta)}` : formatIdr(outcomeDelta),
        deltaPct: outcomeDeltaPct >= 0 ? `+${outcomeDeltaPct.toFixed(1)}%` : `${outcomeDeltaPct.toFixed(1)}%`,
        isPositive: outcomeDelta <= 0, // Lower spending is positive
        sparklineData: last6.map((s) => s.outcome?.total ?? 0),
        color: '#ef4444',
        icon: <Wallet className="w-5 h-5" />,
      });
    }

    // ── 3. Savings Rate ──
    if (currentSummary) {
      const income = currentSummary.income ?? 0;
      const outcome = currentSummary.outcome?.total ?? 0;
      const savingsRate = income > 0 ? ((income - outcome) / income) * 100 : 0;

      const prevIncome = prevSummary?.income ?? 0;
      const prevOutcome = prevSummary?.outcome?.total ?? 0;
      const prevSavingsRate = prevIncome > 0 ? ((prevIncome - prevOutcome) / prevIncome) * 100 : 0;

      const srDelta = savingsRate - prevSavingsRate;

      result.push({
        label: 'Savings Rate',
        value: `${savingsRate.toFixed(1)}%`,
        delta: srDelta >= 0 ? `+${srDelta.toFixed(1)}pp` : `${srDelta.toFixed(1)}pp`,
        deltaPct: '',
        isPositive: srDelta >= 0,
        sparklineData: last6.map((s) => {
          const inc = s.income ?? 0;
          const out = s.outcome?.total ?? 0;
          return inc > 0 ? ((inc - out) / inc) * 100 : 0;
        }),
        color: '#6366f1',
        icon: <PiggyBank className="w-5 h-5" />,
      });
    }

    // ── 4. Net Worth ──
    if (nwCurrent) {
      const nw = nwCurrent.total ?? 0;
      const prevNw = nwPrev?.total ?? 0;
      const nwDelta = nw - prevNw;
      const nwDeltaPct = prevNw > 0 ? (nwDelta / prevNw) * 100 : nw > 0 ? 100 : 0;

      result.push({
        label: 'Net Worth',
        value: formatIdr(nw),
        delta: nwDelta >= 0 ? `+${formatIdr(nwDelta)}` : formatIdr(nwDelta),
        deltaPct: nwDeltaPct >= 0 ? `+${nwDeltaPct.toFixed(1)}%` : `${nwDeltaPct.toFixed(1)}%`,
        isPositive: nwDelta >= 0,
        sparklineData: nwLast6.map((n) => n.total ?? 0),
        color: '#3b82f6',
        icon: <BarChart3 className="w-5 h-5" />,
      });
    }

    return result;
  }, [summaries, networth, activeMonth]);

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 relative overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Subtle color bar at top */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: card.color }}
          />

          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Label row */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-400 dark:text-slate-500">{card.icon}</span>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                  {card.label}
                </p>
              </div>

              {/* Value */}
              <p className="text-2xl font-bold mt-1 truncate">{card.value}</p>

              {/* Delta */}
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                    card.isPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {card.isPositive ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {card.delta}
                </span>
                {card.deltaPct && (
                  <span
                    className={`text-xs font-medium ${
                      card.isPositive
                        ? 'text-emerald-500/70 dark:text-emerald-400/70'
                        : 'text-red-500/70 dark:text-red-400/70'
                    }`}
                  >
                    {card.deltaPct}
                  </span>
                )}
              </div>
            </div>

            {/* Sparkline on the right */}
            <div className="ml-2 shrink-0 self-end">
              <Sparkline data={card.sparklineData} color={card.color} height={40} width={72} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
