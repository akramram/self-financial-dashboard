// Goals Pace Intelligence engine — pure, client-safe (no DB imports).
// Semua tanggal diparse pada tengah hari UTC (T12:00Z) agar bebas geser timezone.
// ponytail: proyeksi ETA linear dari auto-setoran; upgrade ke ledger riil
// goal_contributions bila pola setoran user mulai tidak stabil.

import type { FinancialGoal } from './api';

export type GoalPaceStatus = 'ahead' | 'on_track' | 'behind' | 'at_risk' | 'overdue';
export type GoalEtaStatus = 'done' | 'no_plan' | 'on_time' | 'slightly_late' | 'late';

export interface GoalInput {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  target_date: string;
  completed: boolean;
  color?: string;
}

export interface GoalPace {
  id: number;
  name: string;
  color: string;
  target_date: string;
  remaining: number;
  progressPct: number;
  timePct: number;
  paceDeltaPct: number;
  status: GoalPaceStatus;
  daysLeft: number;
  monthsLeft: number;
  requiredPerMonth: number;
  plannedPerMonth: number;
  projectedMonths: number | null;
  etaDate: string | null;
  etaDeltaDays: number | null;
  etaStatus: GoalEtaStatus;
  nextMilestonePct: number | null;
  milestoneShortfall: number;
}

export type FeasibilityStatus = 'unknown' | 'comfortable' | 'tight' | 'stretched';

export interface PortfolioAnalysis {
  perGoal: GoalPace[];
  totalRequired: number;
  totalPlanned: number;
  coveragePct: number;
  capacity: number | null;
  feasibility: FeasibilityStatus;
  feasibilityGap: number;
  onTrackCount: number;
  behindCount: number;
  overdueCount: number;
  nearestMilestone: { name: string; pct: number; shortfall: number } | null;
  insights: string[];
}

export interface BoostGoalRow {
  id: number;
  name: string;
  extraPerMonth: number;
  newPerMonth: number;
  oldEtaMonths: number | null;
  newEtaMonths: number | null;
  monthsSaved: number | null;
  onTimeAfter: boolean;
}

export interface BoostResult {
  rows: BoostGoalRow[];
  extraMonthly: number;
  onTimeBefore: number;
  onTimeAfter: number;
  totalMonthsSaved: number;
  overCapacity: boolean;
}

export const MILESTONES = [25, 50, 75] as const;
const DAYS_PER_MONTH = 30.4375;
const MIN_MONTHS = 1 / DAYS_PER_MONTH;

export function parseDay(dateStr: string): number {
  return Date.parse(`${dateStr}T12:00:00Z`);
}

export function dayDiff(fromStr: string, toStr: string): number {
  return Math.round((parseDay(toStr) - parseDay(fromStr)) / 86_400_000);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(parseDay(dateStr) + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function monthName(dateStr: string): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return names[new Date(parseDay(dateStr)).getUTCMonth()];
}

export function formatEtaDate(dateStr: string): string {
  const d = new Date(parseDay(dateStr));
  return `${monthName(dateStr)} ${d.getUTCFullYear()}`;
}

export function computeGoalPace(
  goal: GoalInput,
  today: string,
  plannedMonthly: number,
  color = '#6366f1'
): GoalPace {
  const target = goal.target_amount > 0 ? goal.target_amount : 0;
  const current = Math.max(0, Math.min(goal.current_amount, target));
  const remaining = Math.max(0, target - current);
  const progressPct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  const daysTotal = dayDiff(goal.start_date, goal.target_date);
  const daysElapsed = dayDiff(goal.start_date, today);
  const daysLeft = dayDiff(today, goal.target_date); // positif = masih ada waktu
  const timePct = daysTotal > 0 ? Math.max(0, Math.min(100, (daysElapsed / daysTotal) * 100)) : 100;
  const paceDeltaPct = progressPct - timePct;

  let status: GoalPaceStatus;
  if (daysLeft < 0 && remaining > 0) status = 'overdue';
  else if (paceDeltaPct >= 10) status = 'ahead';
  else if (paceDeltaPct >= -10) status = 'on_track';
  else if (paceDeltaPct >= -25) status = 'behind';
  else status = 'at_risk';

  const monthsLeft = Math.max(daysLeft / DAYS_PER_MONTH, 0);
  const requiredPerMonth =
    remaining <= 0 ? 0 : daysLeft < 0 ? remaining : remaining / Math.max(monthsLeft, MIN_MONTHS);

  const planned = Math.max(0, plannedMonthly);
  const projectedMonths = planned > 0 && remaining > 0 ? remaining / planned : null;
  let etaDate: string | null = null;
  let etaDeltaDays: number | null = null;
  if (projectedMonths !== null) {
    etaDate = addDays(today, Math.ceil(projectedMonths * DAYS_PER_MONTH));
    etaDeltaDays = dayDiff(goal.target_date, etaDate);
  }

  let etaStatus: GoalEtaStatus;
  if (remaining <= 0) etaStatus = 'done';
  else if (projectedMonths === null) etaStatus = 'no_plan';
  else if (etaDeltaDays! <= 0) etaStatus = 'on_time';
  else if (etaDeltaDays! <= 30) etaStatus = 'slightly_late';
  else etaStatus = 'late';

  let nextMilestonePct: number | null = null;
  let milestoneShortfall = 0;
  for (const m of MILESTONES) {
    if (progressPct < m) {
      nextMilestonePct = m;
      milestoneShortfall = Math.max(0, (target * m) / 100 - current);
      break;
    }
  }

  return {
    id: goal.id,
    name: goal.name,
    color,
    target_date: goal.target_date,
    remaining,
    progressPct,
    timePct,
    paceDeltaPct,
    status,
    daysLeft,
    monthsLeft,
    requiredPerMonth,
    plannedPerMonth: planned,
    projectedMonths,
    etaDate,
    etaDeltaDays,
    etaStatus,
    nextMilestonePct,
    milestoneShortfall,
  };
}

export function analyzeGoalsPortfolio(
  goals: GoalInput[],
  autoMonthlyById: Map<number, number>,
  capacity: number | null,
  today: string
): PortfolioAnalysis {
  const perGoal = goals
    .filter((g) => !g.completed)
    .map((g) => computeGoalPace(g, today, autoMonthlyById.get(g.id) || 0, g.color || '#6366f1'))
    .sort((a, b) => {
      const rank: Record<GoalPaceStatus, number> = { overdue: 0, at_risk: 1, behind: 2, on_track: 3, ahead: 4 };
      return rank[a.status] - rank[b.status] || b.paceDeltaPct - a.paceDeltaPct;
    });

  const totalRequired = perGoal.reduce((s, g) => s + g.requiredPerMonth, 0);
  const totalPlanned = perGoal.reduce((s, g) => s + g.plannedPerMonth, 0);
  const coveragePct = totalRequired > 0 ? Math.min(100, (totalPlanned / totalRequired) * 100) : 100;

  let feasibility: FeasibilityStatus = 'unknown';
  let feasibilityGap = 0;
  if (capacity !== null) {
    if (capacity >= totalRequired * 1.2) feasibility = 'comfortable';
    else if (capacity >= totalRequired) feasibility = 'tight';
    else {
      feasibility = 'stretched';
      feasibilityGap = totalRequired - capacity;
    }
  }

  const onTrackCount = perGoal.filter((g) => g.status === 'on_track' || g.status === 'ahead').length;
  const behindCount = perGoal.filter((g) => g.status === 'behind' || g.status === 'at_risk').length;
  const overdueCount = perGoal.filter((g) => g.status === 'overdue').length;

  let nearestMilestone: PortfolioAnalysis['nearestMilestone'] = null;
  for (const g of perGoal) {
    if (g.nextMilestonePct !== null) {
      if (!nearestMilestone || g.milestoneShortfall < nearestMilestone.shortfall) {
        nearestMilestone = { name: g.name, pct: g.nextMilestonePct, shortfall: g.milestoneShortfall };
      }
    }
  }

  const insights = buildInsights(perGoal, capacity, feasibility, feasibilityGap, coveragePct, nearestMilestone);

  return {
    perGoal,
    totalRequired,
    totalPlanned,
    coveragePct,
    capacity,
    feasibility,
    feasibilityGap,
    onTrackCount,
    behindCount,
    overdueCount,
    nearestMilestone,
    insights,
  };
}

function fmtJt(v: number): string {
  if (v >= 1_000_000) {
    const jt = v / 1_000_000;
    return `Rp ${jt >= 10 ? Math.round(jt) : Math.round(jt * 10) / 10}jt`;
  }
  if (v >= 1_000) return `Rp ${Math.round(v / 1_000)}rb`;
  return `Rp ${Math.round(v)}`;
}

function buildInsights(
  perGoal: GoalPace[],
  capacity: number | null,
  feasibility: FeasibilityStatus,
  feasibilityGap: number,
  coveragePct: number,
  nearestMilestone: PortfolioAnalysis['nearestMilestone']
): string[] {
  const out: string[] = [];
  const active = perGoal.length;
  if (active === 0) return out;

  if (feasibility === 'comfortable' && capacity !== null) {
    out.push(
      `Kapasitas surplus ${fmtJt(capacity)}/bulan mencakup seluruh kebutuhan setoran ${fmtJt(perGoal.reduce((s, g) => s + g.requiredPerMonth, 0))}/bulan. Semua target masih sangat feasible.`
    );
  } else if (feasibility === 'tight' && capacity !== null) {
    out.push(
      `Kapasitas surplus ${fmtJt(capacity)}/bulan pas-pasan dengan kebutuhan setoran. Hindari target baru sebelum ada goal selesai.`
    );
  } else if (feasibility === 'stretched') {
    out.push(
      `Kebutuhan setoran melebihi kapasitas surplus ${fmtJt(feasibilityGap)}/bulan. Pertimbangkan geser tenggat goal terjauh atau tambah pemasukan.`
    );
  }

  if (coveragePct < 100 && perGoal.some((g) => g.plannedPerMonth === 0 && g.remaining > 0)) {
    const tanpaPlan = perGoal.filter((g) => g.plannedPerMonth === 0 && g.remaining > 0).length;
    out.push(
      `${tanpaPlan} goal belum terhubung auto-setoran (recurring). Tanpa sumber rutin, ETA tidak bisa diproyeksikan.`
    );
  }

  const late = perGoal.filter((g) => g.etaStatus === 'late');
  if (late.length > 0) {
    const worst = late[0];
    out.push(
      `${worst.name} diproyeksikan meleset ${Math.round((worst.etaDeltaDays || 0) / DAYS_PER_MONTH)} bulan dari tenggat. Butuh ${fmtJt(worst.requiredPerMonth)}/bulan agar tepat waktu.`
    );
  }

  if (perGoal.some((g) => g.status === 'overdue')) {
    out.push(
      `${perGoal.filter((g) => g.status === 'overdue').length} goal sudah lewat tenggat. Selesaikan atau perbarui target datenya.`
    );
  }

  if (nearestMilestone) {
    out.push(
      `Milestone terdekat: ${nearestMilestone.name} menyentuh ${nearestMilestone.pct}% (kurang ${fmtJt(nearestMilestone.shortfall)} lagi).`
    );
  }

  return out.slice(0, 4);
}

export function simulateBoost(
  analysis: PortfolioAnalysis,
  extraMonthly: number,
  today: string
): BoostResult {
  const extra = Math.max(0, extraMonthly);
  const active = analysis.perGoal.filter((g) => g.remaining > 0);

  const totalRequired = active.reduce((s, g) => s + g.requiredPerMonth, 0);
  const shares = new Map<number, number>();
  if (extra > 0 && active.length > 0) {
    if (totalRequired > 0) {
      for (const g of active) shares.set(g.id, extra * (g.requiredPerMonth / totalRequired));
    } else {
      for (const g of active) shares.set(g.id, extra / active.length);
    }
  }

  const onTimeBefore = active.filter(
    (g) => g.etaStatus === 'on_time' || g.etaStatus === 'done'
  ).length;

  let totalMonthsSaved = 0;
  const rows: BoostGoalRow[] = active.map((g) => {
    const extraShare = shares.get(g.id) || 0;
    const newPerMonth = g.plannedPerMonth + extraShare;
    const newEtaMonths = newPerMonth > 0 ? g.remaining / newPerMonth : null;
    const monthsSaved =
      g.projectedMonths !== null && newEtaMonths !== null
        ? Math.max(0, g.projectedMonths - newEtaMonths)
        : null;
    if (monthsSaved !== null) totalMonthsSaved += monthsSaved;
    const onTimeAfter =
      newEtaMonths === null || g.daysLeft < 0
        ? false
        : dayDiff(g.target_date, addDays(today, Math.ceil(newEtaMonths * DAYS_PER_MONTH))) <= 0;
    return {
      id: g.id,
      name: g.name,
      extraPerMonth: extraShare,
      newPerMonth,
      oldEtaMonths: g.projectedMonths,
      newEtaMonths,
      monthsSaved,
      onTimeAfter,
    };
  });

  const onTimeAfter = rows.filter((r) => r.onTimeAfter).length;

  return {
    rows,
    extraMonthly: extra,
    onTimeBefore,
    onTimeAfter,
    totalMonthsSaved,
    overCapacity:
      analysis.capacity !== null &&
      analysis.totalRequired + extra > analysis.capacity,
  };
}
