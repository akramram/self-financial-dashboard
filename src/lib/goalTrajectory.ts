/**
 * Goal Trajectory Projection
 *
 * Pure functions that analyze how realistic each active goal's target date is,
 * based on the user's actual savings trend (net worth growth). Used by the
 * `/api/goal-trajectory` endpoint and the `GoalTrajectory` widget.
 *
 * No DB access here — the caller passes in goals + networth snapshots. This
 * keeps the module deterministic and unit-testable.
 */

import type { NetworthRecord } from './data';

/** Goal as returned by `getGoals()` / the goals API. */
export interface GoalInput {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  target_date: string;
  color: string;
  icon: string;
  completed: number | boolean;
}

export type TrajectoryStatus = 'ahead' | 'on_track' | 'at_risk' | 'behind' | 'completed';

export interface GoalTrajectory {
  id: number;
  name: string;
  color: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  remaining: number;
  target_date: string;
  /** Average IDR saved per month over the lookback window. */
  monthly_savings: number;
  /** Months until the goal is fully funded at the current pace (Infinity if pace ≤ 0). */
  projected_months: number;
  /** ISO date string of the projected completion date (null if unprojectable). */
  projected_date: string | null;
  /** Days between projected_date and target_date. Positive = late, negative = early. */
  days_delta: number | null;
  /** IDR gap at the target date (max(0, target - projected savings at target)). */
  projected_gap_idr: number;
  /** IDR the user needs to save per month to hit the target date exactly. */
  required_monthly: number;
  status: TrajectoryStatus;
}

export interface GoalTrajectoryResult {
  /** Per-goal projections, sorted by urgency (behind → ahead). */
  goals: GoalTrajectory[];
  /** Net worth samples used to compute the savings trend (newest-last ordering). */
  trend: { month: string; total: number }[];
  /** Average monthly savings over the window (IDR). */
  average_monthly_savings: number;
  /** False when there are fewer than 2 net worth samples — trend is noise. */
  has_sufficient_data: boolean;
  /** "today" reference date passed in (ISO yyyy-mm-dd). */
  as_of: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const AVG_MONTH_DAYS = 30;

function parseDate(s: string): number {
  // Accept ISO yyyy-mm-dd or full ISO; return epoch ms.
  return new Date(s.length >= 10 ? s.slice(0, 10) : s).getTime();
}

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Average IDR saved per month across the net worth samples.
 *
 * Computed as (last - first) / (months between). "Months between" uses a
 * 30-day normalisation so the figure stays stable regardless of the calendar
 * length of any individual period.
 *
 * Returns 0 if there are fewer than 2 samples. Can return negative values
 * when net worth has declined across the window — that's a real signal the
 * caller should surface, not an error to hide.
 */
export function computeAverageMonthlySavings(
  networth: Pick<NetworthRecord, 'month' | 'total' | 'date'>[],
  windowSize = 6,
): { average: number; trend: { month: string; total: number }[] } {
  if (!networth || networth.length < 2) {
    return { average: 0, trend: [] };
  }
  // Oldest → newest by date.
  const sorted = [...networth].sort(
    (a, b) => parseDate(a.date) - parseDate(b.date),
  );
  const window = sorted.slice(-Math.max(2, windowSize));
  const first = window[0];
  const last = window[window.length - 1];
  const dayDiff = (parseDate(last.date) - parseDate(first.date)) / DAY_MS;
  if (dayDiff <= 0) {
    return { average: 0, trend: window.map((w) => ({ month: w.month, total: w.total })) };
  }
  const months = dayDiff / AVG_MONTH_DAYS;
  const average = (last.total - first.total) / months;
  return {
    average,
    trend: window.map((w) => ({ month: w.month, total: w.total })),
  };
}

function classifyStatus(
  daysDelta: number | null,
  monthlySavings: number,
  isCompleted: boolean,
): TrajectoryStatus {
  if (isCompleted) return 'completed';
  if (monthlySavings <= 0) return 'behind';
  if (daysDelta === null) return 'behind';
  // daysDelta > 0  → projected LATER than target (late)
  // daysDelta <= 0 → projected EARLIER than or equal to target
  if (daysDelta <= -14) return 'ahead';     // ≥ 2 weeks early
  if (daysDelta <= 14) return 'on_track';   // within ±2 weeks
  if (daysDelta <= 60) return 'at_risk';    // 2-8 weeks late
  return 'behind';                          // > 8 weeks late
}

/**
 * Project each active goal's completion date from the user's savings pace.
 *
 * - Active goals = `completed` falsy.
 * - Completed goals are dropped entirely from the output.
 * - When `networth` has fewer than 2 samples every goal is reported with
 *   `status: 'behind'`, `projected_date: null`, and `monthly_savings: 0` —
 *   the UI surfaces an "insufficient data" banner instead of numbers.
 * - `monthlySavingsOverride`, when provided, replaces the computed pace —
 *   useful for tests and for a future "what-if" mode.
 */
export function analyzeGoalTrajectory(
  goals: GoalInput[],
  networth: Pick<NetworthRecord, 'month' | 'total' | 'date'>[],
  options: { asOf?: string; windowSize?: number; monthlySavingsOverride?: number } = {},
): GoalTrajectoryResult {
  const asOf = options.asOf ?? new Date().toISOString().slice(0, 10);
  const windowSize = options.windowSize ?? 6;
  const { average, trend } = computeAverageMonthlySavings(networth, windowSize);
  const monthlySavings = options.monthlySavingsOverride ?? average;
  const hasSufficientData = (networth?.length ?? 0) >= 2;
  const asOfMs = parseDate(asOf);

  const activeGoals = (goals ?? []).filter((g) => !g.completed);

  const projections: GoalTrajectory[] = activeGoals.map((goal) => {
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);
    const targetMs = parseDate(goal.target_date);

    let projectedMonths: number;
    let projectedDateMs: number | null;
    let daysDelta: number | null;
    let projectedGapIdr: number;
    let requiredMonthly: number;

    if (!hasSufficientData || monthlySavings <= 0) {
      projectedMonths = Infinity;
      projectedDateMs = null;
      daysDelta = null;
      projectedGapIdr = remaining;
      const targetDayDiff = Math.max(1, (targetMs - asOfMs) / DAY_MS);
      requiredMonthly = remaining / (targetDayDiff / AVG_MONTH_DAYS);
    } else {
      projectedMonths = remaining / monthlySavings;
      projectedDateMs = asOfMs + projectedMonths * AVG_MONTH_DAYS * DAY_MS;
      daysDelta = (projectedDateMs - targetMs) / DAY_MS;
      const monthsUntilTarget = Math.max(0, (targetMs - asOfMs) / DAY_MS / AVG_MONTH_DAYS);
      const projectedAtTarget = goal.current_amount + monthlySavings * monthsUntilTarget;
      projectedGapIdr = Math.max(0, goal.target_amount - projectedAtTarget);
      requiredMonthly = monthsUntilTarget > 0 ? remaining / monthsUntilTarget : remaining;
    }

    const status = classifyStatus(
      hasSufficientData ? daysDelta : null,
      monthlySavings,
      Boolean(goal.completed),
    );

    return {
      id: goal.id,
      name: goal.name,
      color: goal.color,
      icon: goal.icon,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      remaining,
      target_date: goal.target_date,
      monthly_savings: monthlySavings,
      projected_months: projectedMonths,
      projected_date: projectedDateMs === null ? null : toIsoDate(projectedDateMs),
      days_delta: daysDelta,
      projected_gap_idr: projectedGapIdr,
      required_monthly: requiredMonthly,
      status,
    };
  });

  // Sort: behind → at_risk → on_track → ahead (most urgent first).
  const statusOrder: Record<TrajectoryStatus, number> = {
    behind: 0,
    at_risk: 1,
    on_track: 2,
    ahead: 3,
    completed: 4,
  };
  projections.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return {
    goals: projections,
    trend,
    average_monthly_savings: monthlySavings,
    has_sufficient_data: hasSufficientData,
    as_of: asOf,
  };
}
