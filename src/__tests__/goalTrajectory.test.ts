/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  analyzeGoalTrajectory,
  computeAverageMonthlySavings,
  type GoalInput,
} from '../lib/goalTrajectory';

function makeGoal(overrides: Partial<GoalInput> = {}): GoalInput {
  return {
    id: 1,
    name: 'Test Goal',
    target_amount: 10000000,
    current_amount: 5000000,
    start_date: '2026-01-01',
    target_date: '2026-12-31',
    color: '#6366f1',
    icon: 'savings',
    completed: 0,
    ...overrides,
  };
}

/** Build a synthetic ascending networth series spaced 30 days apart. */
function ascendingNetworth(start: number, step: number, count: number) {
  const out: { month: string; total: number; date: string }[] = [];
  const baseMs = new Date('2026-01-21').getTime();
  const monthLabels = [
    'January 2026', 'February 2026', 'March 2026', 'April 2026',
    'May 2026', 'June 2026', 'July 2026', 'August 2026',
    'September 2026', 'October 2026', 'November 2026', 'December 2026',
  ];
  for (let i = 0; i < count; i++) {
    out.push({
      month: monthLabels[i] ?? `Month ${i}`,
      total: start + step * i,
      date: new Date(baseMs + i * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
  }
  return out;
}

describe('computeAverageMonthlySavings', () => {
  it('returns 0 average and empty trend for empty input', () => {
    const result = computeAverageMonthlySavings([]);
    expect(result.average).toBe(0);
    expect(result.trend).toEqual([]);
  });

  it('returns 0 average for a single sample (no trend possible)', () => {
    const result = computeAverageMonthlySavings([
      { month: 'July 2026', total: 30000000, date: '2026-07-21' },
    ]);
    expect(result.average).toBe(0);
    expect(result.trend).toEqual([]);
  });

  it('computes the monthly average from a steady linear trend', () => {
    // +1,000,000 per month over 6 samples = +5M / 5 months = 1M/month.
    const series = ascendingNetworth(25_000_000, 1_000_000, 6);
    const result = computeAverageMonthlySavings(series);
    expect(result.trend).toHaveLength(6);
    // Allow ±2% tolerance from the 30-day normalisation.
    expect(result.average).toBeGreaterThan(980_000);
    expect(result.average).toBeLessThan(1_020_000);
  });

  it('returns a negative average when networth declines', () => {
    const series = ascendingNetworth(30_000_000, -500_000, 4);
    const result = computeAverageMonthlySavings(series);
    expect(result.average).toBeLessThan(0);
  });

  it('trims to the last windowSize samples', () => {
    // 12 samples but windowSize 4 → only the last 4 should be used.
    const series = ascendingNetworth(10_000_000, 500_000, 12);
    const result = computeAverageMonthlySavings(series, 4);
    expect(result.trend).toHaveLength(4);
    // Last 4 samples: indexes 9, 10, 11 → totals 14.5M, 15M, 15.5M, 16M
    // step is +500k per sample, so average = +500k/month.
    expect(result.average).toBeGreaterThan(480_000);
    expect(result.average).toBeLessThan(520_000);
  });
});

describe('analyzeGoalTrajectory', () => {
  it('marks goals as "behind" with no projection when networth is empty', () => {
    // Goals are still surfaced (so the UI can explain per-goal) but every
    // projection field is nulled out and the overall result flags
    // insufficient data.
    const result = analyzeGoalTrajectory([makeGoal()], []);
    expect(result.has_sufficient_data).toBe(false);
    expect(result.average_monthly_savings).toBe(0);
    expect(result.goals).toHaveLength(1);
    expect(result.goals[0].status).toBe('behind');
    expect(result.goals[0].projected_date).toBeNull();
    expect(result.goals[0].days_delta).toBeNull();
    expect(result.goals[0].monthly_savings).toBe(0);
  });

  it('returns truly empty goals list when there are no goals at all', () => {
    const series = ascendingNetworth(20_000_000, 1_000_000, 4);
    const result = analyzeGoalTrajectory([], series);
    expect(result.goals).toEqual([]);
    expect(result.has_sufficient_data).toBe(true);
  });

  it('drops completed goals from the output', () => {
    const completed = makeGoal({ id: 10, completed: 1 });
    const active = makeGoal({ id: 11, completed: 0 });
    const series = ascendingNetworth(20_000_000, 500_000, 4);
    const result = analyzeGoalTrajectory([completed, active], series);
    expect(result.goals).toHaveLength(1);
    expect(result.goals[0].id).toBe(11);
  });

  it('marks every goal as "behind" when insufficient data', () => {
    const goal = makeGoal({ remaining: 5_000_000 } as any);
    const result = analyzeGoalTrajectory([goal], [
      { month: 'July 2026', total: 30_000_000, date: '2026-07-21' },
    ]);
    expect(result.has_sufficient_data).toBe(false);
    expect(result.goals[0].status).toBe('behind');
    expect(result.goals[0].projected_date).toBeNull();
    expect(result.goals[0].days_delta).toBeNull();
  });

  it('reports "ahead" when projected completion is ≥ 2 weeks before target', () => {
    // Savings pace 2M/month, 1M remaining → 0.5 months = 15 days to complete.
    // Target is 6 months away → projected 15 days vs target 180 days → way ahead.
    const goal = makeGoal({
      target_amount: 6_000_000,
      current_amount: 5_000_000,
      start_date: '2026-01-01',
      target_date: '2027-01-01',
    });
    const series = ascendingNetworth(20_000_000, 2_000_000, 6);
    const result = analyzeGoalTrajectory([goal], series, { asOf: '2026-07-01' });
    expect(result.goals[0].status).toBe('ahead');
    expect(result.goals[0].days_delta!).toBeLessThan(-14);
  });

  it('reports "on_track" when projected completion is within ±2 weeks of target', () => {
    // Tune goal so projected_date ≈ target_date.
    // Savings pace 1M/month, 6M remaining → 6 months = 180 days.
    // Set target 180 days from asOf.
    const asOf = '2026-07-01';
    const targetMs = new Date(asOf).getTime() + 180 * 24 * 60 * 60 * 1000;
    const target_date = new Date(targetMs).toISOString().slice(0, 10);
    const goal = makeGoal({
      target_amount: 11_000_000,
      current_amount: 5_000_000,
      target_date,
    });
    const series = ascendingNetworth(20_000_000, 1_000_000, 6);
    const result = analyzeGoalTrajectory([goal], series, { asOf });
    expect(result.goals[0].status).toBe('on_track');
    expect(Math.abs(result.goals[0].days_delta!)).toBeLessThan(14);
  });

  it('reports "at_risk" when projected 2-8 weeks late', () => {
    // Savings 1M/month, 7M remaining → 7 months = 210 days.
    // Target 180 days from asOf → 30 days late → at_risk.
    const asOf = '2026-07-01';
    const targetMs = new Date(asOf).getTime() + 180 * 24 * 60 * 60 * 1000;
    const target_date = new Date(targetMs).toISOString().slice(0, 10);
    const goal = makeGoal({
      target_amount: 12_000_000,
      current_amount: 5_000_000,
      target_date,
    });
    const series = ascendingNetworth(20_000_000, 1_000_000, 6);
    const result = analyzeGoalTrajectory([goal], series, { asOf });
    expect(result.goals[0].status).toBe('at_risk');
    expect(result.goals[0].days_delta!).toBeGreaterThan(14);
    expect(result.goals[0].days_delta!).toBeLessThanOrEqual(60);
  });

  it('reports "behind" when projected more than 8 weeks late', () => {
    // Savings 1M/month, 12M remaining → 12 months = 360 days.
    // Target 180 days from asOf → 180 days late → behind.
    const asOf = '2026-07-01';
    const targetMs = new Date(asOf).getTime() + 180 * 24 * 60 * 60 * 1000;
    const target_date = new Date(targetMs).toISOString().slice(0, 10);
    const goal = makeGoal({
      target_amount: 17_000_000,
      current_amount: 5_000_000,
      target_date,
    });
    const series = ascendingNetworth(20_000_000, 1_000_000, 6);
    const result = analyzeGoalTrajectory([goal], series, { asOf });
    expect(result.goals[0].status).toBe('behind');
    expect(result.goals[0].days_delta!).toBeGreaterThan(60);
  });

  it('reports "behind" when monthly savings is negative regardless of date', () => {
    const goal = makeGoal({ target_date: '2030-01-01' });
    const series = ascendingNetworth(30_000_000, -1_000_000, 5);
    const result = analyzeGoalTrajectory([goal], series, { asOf: '2026-07-01' });
    expect(result.goals[0].status).toBe('behind');
    expect(result.goals[0].monthly_savings).toBeLessThan(0);
  });

  it('sorts goals by urgency (behind → ahead)', () => {
    const asOf = '2026-07-01';
    const farTarget = '2030-01-01';
    const nearTarget = '2026-08-01';
    const series = ascendingNetworth(20_000_000, 500_000, 6);
    const goals = [
      makeGoal({ id: 1, target_amount: 5_500_000, current_amount: 5_000_000, target_date: farTarget }),
      makeGoal({ id: 2, target_amount: 100_000_000, current_amount: 1_000_000, target_date: nearTarget }),
    ];
    const result = analyzeGoalTrajectory(goals, series, { asOf });
    // Goal 2 should be more urgent (behind) → appears first.
    expect(result.goals[0].id).toBe(2);
    expect(result.goals[1].id).toBe(1);
  });

  it('uses monthlySavingsOverride when provided', () => {
    const series = ascendingNetworth(20_000_000, 1_000_000, 6);
    const result = analyzeGoalTrajectory(
      [makeGoal()],
      series,
      { asOf: '2026-07-01', monthlySavingsOverride: 2_500_000 },
    );
    expect(result.average_monthly_savings).toBe(2_500_000);
    expect(result.goals[0].monthly_savings).toBe(2_500_000);
  });

  it('computes projected_gap_idr as 0 when pace outpaces target', () => {
    // Fast pace, small remaining → gap should be 0.
    const goal = makeGoal({
      target_amount: 5_500_000,
      current_amount: 5_000_000,
      target_date: '2030-01-01',
    });
    const series = ascendingNetworth(20_000_000, 2_000_000, 6);
    const result = analyzeGoalTrajectory([goal], series, { asOf: '2026-07-01' });
    expect(result.goals[0].projected_gap_idr).toBe(0);
  });

  it('reports required_monthly > 0 when goal is underfunded for its target date', () => {
    const asOf = '2026-07-01';
    const targetMs = new Date(asOf).getTime() + 90 * 24 * 60 * 60 * 1000; // 3 months
    const target_date = new Date(targetMs).toISOString().slice(0, 10);
    const goal = makeGoal({
      target_amount: 10_000_000,
      current_amount: 2_000_000, // 8M short, needs ~2.67M/month
      target_date,
    });
    const series = ascendingNetworth(20_000_000, 500_000, 6); // actual pace 500k/mo
    const result = analyzeGoalTrajectory([goal], series, { asOf });
    expect(result.goals[0].required_monthly).toBeGreaterThan(2_000_000);
  });

  it('preserves goal identity fields (color, icon, name) in the output', () => {
    const goal = makeGoal({
      name: 'EV Battery',
      color: '#22c55e',
      icon: 'car',
    });
    const series = ascendingNetworth(20_000_000, 1_000_000, 4);
    const result = analyzeGoalTrajectory([goal], series);
    expect(result.goals[0].name).toBe('EV Battery');
    expect(result.goals[0].color).toBe('#22c55e');
    expect(result.goals[0].icon).toBe('car');
  });

  it('treats completed=1 (number) the same as completed=true (boolean)', () => {
    const goalNumeric = makeGoal({ id: 1, completed: 1 as any });
    const goalBool = makeGoal({ id: 2, completed: true });
    const series = ascendingNetworth(20_000_000, 1_000_000, 4);
    const result = analyzeGoalTrajectory([goalNumeric, goalBool], series);
    expect(result.goals).toEqual([]);
  });
});
