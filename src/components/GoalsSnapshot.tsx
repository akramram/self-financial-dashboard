import React, { useEffect, useMemo, useState } from 'react';
import { Target, Flag, ChevronRight } from 'lucide-react';
import { fetchGoals, type FinancialGoal } from '../lib/api';
import { onDataChanged } from '../lib/dataSync';
import { formatIdr } from '../lib/utils';

// Compact Dashboard widget: active goals progress + projected finish date.
// Reads /api/goals client-side (no complex props — devalue-safe) and live-syncs
// when transactions/summaries change (kickoff bumps goal current_amount).
// ponytail: ETA assumes the contribution rate of the last 3 periods holds;
// recompute properly if goals ever get irregular manual top-ups dominance.

const GOAL_ICONS: Record<string, React.ReactNode> = {
  savings: <Target className="w-4 h-4" />, // closest glyph; GoalsTracker map is heavier
  target: <Target className="w-4 h-4" />,
  star: <Flag className="w-4 h-4" />,
};

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0" role="img" aria-label={`${Math.round(v)}% complete`}>
      <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" className="stroke-slate-200 dark:stroke-white/10" />
      <circle
        cx="26" cy="26" r={r} fill="none" strokeWidth="5" stroke={color}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (v / 100) * c}
        transform="rotate(-90 26 26)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="26" y="30" textAnchor="middle" className="fill-slate-700 dark:fill-white/90" style={{ fontSize: 11, fontWeight: 700 }}>
        {Math.round(v)}%
      </text>
    </svg>
  );
}

function etaLabel(goal: FinancialGoal): string {
  const remaining = goal.target_amount - goal.current_amount;
  if (remaining <= 0) return 'Reached';
  // Rate: current_amount spread evenly across the goal's elapsed months,
  // min 1 month — avoids a per-period ledger query for a glance widget.
  const start = goal.start_date ? new Date(goal.start_date) : null;
  const monthsElapsed = start && !isNaN(start.getTime())
    ? Math.max(1, Math.round((Date.now() - start.getTime()) / (30.44 * 24 * 3600 * 1000)))
    : 1;
  const perMonth = goal.current_amount / monthsElapsed;
  if (perMonth <= 0) return 'No pace yet';
  const monthsLeft = remaining / perMonth;
  if (monthsLeft > 240) return 'Far off';
  const eta = new Date();
  eta.setMonth(eta.getMonth() + Math.ceil(monthsLeft));
  const target = goal.target_date ? new Date(goal.target_date) : null;
  const onTrack = !target || isNaN(target.getTime()) || eta <= target;
  return `${eta.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}${onTrack ? '' : ' · late'}`;
}

export default function GoalsSnapshot() {
  const [goals, setGoals] = useState<FinancialGoal[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => fetchGoals()
      .then((g) => { if (alive) setGoals(g); })
      .catch(() => { if (alive && goals === null) setGoals([]); });
    load();
    const off = onDataChanged(load);
    return () => { alive = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = useMemo(
    () => (goals ?? []).filter((g) => !g.completed).slice(0, 3),
    [goals],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80">Goals</h3>
        <a href="/goals" className="flex items-center gap-0.5 text-xs text-mint-500 hover:text-mint-400 no-underline">
          All goals <ChevronRight className="w-3 h-3" />
        </a>
      </div>

      {goals === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-white/[0.05] animate-pulse" />)}
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-5 gap-2 text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-200/60 dark:bg-white/[0.06]">
            <Target className="w-5 h-5 text-slate-400 dark:text-white/40" strokeWidth={1.8} />
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40">No active goals yet</p>
          <a href="/goals" className="text-xs text-mint-500 hover:text-mint-400 no-underline">Set one up →</a>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {active.map((g) => {
            const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
            return (
              <li key={g.id}>
                <a
                  href="/goals"
                  className="flex items-center gap-3 p-2 -m-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] transition no-underline group"
                  aria-label={`Goal ${g.name}: ${Math.round(pct)}% funded, ETA ${etaLabel(g)}`}
                >
                  <Ring pct={pct} color={g.color || '#10b981'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white/85 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {g.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-white/40 truncate">
                      {formatIdr(g.current_amount)} / {formatIdr(g.target_amount)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-medium text-slate-600 dark:text-white/60">{etaLabel(g)}</p>
                    <p className="text-[10px] text-slate-400 dark:text-white/30">est. finish</p>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
