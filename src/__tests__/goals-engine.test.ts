import { describe, it, expect } from 'vitest';
import {
  computeGoalPace,
  analyzeGoalsPortfolio,
  simulateBoost,
  dayDiff,
  addDays,
  formatEtaDate,
  parseDay,
  type GoalInput,
} from '../lib/goals-engine';

const TODAY = '2026-07-02';

function goal(overrides: Partial<GoalInput>): GoalInput {
  return {
    id: 1,
    name: 'Dana Darurat',
    target_amount: 12_000_000,
    current_amount: 6_000_000,
    start_date: '2026-01-01',
    target_date: '2026-12-31',
    completed: false,
    color: '#10b981',
    ...overrides,
  };
}

describe('goals-engine date helpers', () => {
  it('dayDiff menghitung selisih hari UTC-noon tanpa geser timezone', () => {
    expect(dayDiff('2026-01-01', '2026-12-31')).toBe(364);
    expect(dayDiff('2026-07-02', '2026-07-02')).toBe(0);
    expect(dayDiff('2026-12-31', '2026-07-02')).toBe(-182);
  });

  it('addDays menambah hari dan membulatkan ISO', () => {
    expect(addDays('2026-07-02', 122)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('formatEtaDate memakai label bulan Indonesia', () => {
    expect(formatEtaDate('2026-11-01')).toBe('Nov 2026');
    expect(formatEtaDate('2026-08-20')).toBe('Agu 2026');
  });

  it('parseDay stabil di tengah hari UTC', () => {
    expect(parseDay('2026-07-02')).toBe(Date.parse('2026-07-02T12:00:00Z'));
  });
});

describe('computeGoalPace', () => {
  it('goal 50% progres pada 50% waktu = on_track', () => {
    const p = computeGoalPace(goal({}), TODAY, 0);
    expect(p.status).toBe('on_track');
    expect(Math.round(p.progressPct)).toBe(50);
    expect(Math.round(p.timePct)).toBe(50);
  });

  it('progres jauh di depan waktu = ahead', () => {
    const p = computeGoalPace(goal({ current_amount: 9_000_000 }), TODAY, 0);
    expect(p.status).toBe('ahead');
  });

  it('progres tertinggal sedang = behind', () => {
    const p = computeGoalPace(goal({ current_amount: 4_200_000 }), TODAY, 0);
    expect(p.status).toBe('behind');
  });

  it('progres tertinggal parah = at_risk', () => {
    const p = computeGoalPace(goal({ current_amount: 2_000_000 }), TODAY, 0);
    expect(p.status).toBe('at_risk');
  });

  it('tenggat terlewat = overdue dan butuh nominal penuh', () => {
    const p = computeGoalPace(
      goal({ target_date: '2026-06-30', current_amount: 1_000_000 }),
      TODAY,
      0
    );
    expect(p.status).toBe('overdue');
    expect(p.requiredPerMonth).toBe(11_000_000);
    expect(p.daysLeft).toBeLessThan(0);
  });

  it('requiredPerMonth = sisa bagi sisa bulan', () => {
    const p = computeGoalPace(goal({}), TODAY, 0);
    const monthsLeft = dayDiff(TODAY, '2026-12-31') / 30.4375;
    expect(p.requiredPerMonth).toBeCloseTo(6_000_000 / monthsLeft, 0);
  });

  it('dengan auto-setoran 1.5jt/bulan, ETA on_time dan etaDate benar', () => {
    const p = computeGoalPace(goal({}), TODAY, 1_500_000);
    expect(p.projectedMonths).toBeCloseTo(4, 5);
    expect(p.etaDate).toBe('2026-11-01');
    expect(p.etaStatus).toBe('on_time');
    expect(p.etaDeltaDays).toBe(-60);
  });

  it('auto-setoran kecil menghasilkan etaStatus late', () => {
    const p = computeGoalPace(goal({ current_amount: 0 }), TODAY, 300_000);
    expect(p.etaStatus).toBe('late');
    expect(p.etaDeltaDays! > 30).toBe(true);
  });

  it('tanpa auto-setoran = no_plan', () => {
    const p = computeGoalPace(goal({ current_amount: 0 }), TODAY, 0);
    expect(p.etaStatus).toBe('no_plan');
    expect(p.etaDate).toBeNull();
  });

  it('milestone 25/50 terlewati, berikutnya 75 dengan shortfall 3jt', () => {
    const p = computeGoalPace(goal({}), TODAY, 0);
    expect(p.nextMilestonePct).toBe(75);
    expect(p.milestoneShortfall).toBe(3_000_000);
  });

  it('goal selesai (remaining 0) = etaStatus done', () => {
    const p = computeGoalPace(goal({ current_amount: 12_000_000 }), TODAY, 0);
    expect(p.remaining).toBe(0);
    expect(p.etaStatus).toBe('done');
  });
});

describe('analyzeGoalsPortfolio', () => {
  const goals: GoalInput[] = [
    goal({ id: 1, name: 'Emergency', current_amount: 9_000_000 }), // ahead
    goal({ id: 2, name: 'Umroh', current_amount: 2_000_000, target_amount: 24_000_000 }), // at_risk
    goal({ id: 3, name: 'Laptop', completed: true }),
  ];

  it('goal completed diecualikan, urutan di-sort dari paling urgent', () => {
    const a = analyzeGoalsPortfolio(goals, new Map([[2, 500_000]]), 3_000_000, TODAY);
    expect(a.perGoal).toHaveLength(2);
    expect(a.perGoal[0].name).toBe('Umroh');
    expect(a.perGoal[1].name).toBe('Emergency');
  });

  it('feasibility comfortable saat kapasitas >= 1.2x kebutuhan', () => {
    const a = analyzeGoalsPortfolio(goals, new Map(), 10_000_000, TODAY);
    expect(a.feasibility).toBe('comfortable');
  });

  it('feasibility stretched dengan gap benar', () => {
    const a = analyzeGoalsPortfolio(goals, new Map(), 500_000, TODAY);
    expect(a.feasibility).toBe('stretched');
    expect(a.feasibilityGap).toBeCloseTo(a.totalRequired - 500_000, 0);
  });

  it('kapasitas null = feasibility unknown', () => {
    const a = analyzeGoalsPortfolio(goals, new Map(), null, TODAY);
    expect(a.feasibility).toBe('unknown');
  });

  it('coverage di-cap 100 persen', () => {
    const a = analyzeGoalsPortfolio(goals, new Map([[2, 50_000_000]]), null, TODAY);
    expect(a.coveragePct).toBe(100);
  });

  it('milestone terdekat memilih shortfall terkecil', () => {
    const goals2: GoalInput[] = [
      goal({ id: 1, name: 'Emergency', current_amount: 8_400_000 }), // 70% -> milestone 75, shortfall 600rb
      goal({ id: 2, name: 'Umroh', target_amount: 24_000_000, current_amount: 2_000_000 }), // 8.3% -> milestone 25, shortfall 4jt
    ];
    const a = analyzeGoalsPortfolio(goals2, new Map(), null, TODAY);
    expect(a.nearestMilestone).not.toBeNull();
    expect(a.nearestMilestone!.name).toBe('Emergency');
    expect(a.nearestMilestone!.shortfall).toBe(600_000);
  });

  it('insight muncul untuk goal tanpa auto-setoran dan bebas em-dash', () => {
    const a = analyzeGoalsPortfolio(goals, new Map(), 3_000_000, TODAY);
    const all = a.insights.join(' ');
    expect(all).not.toContain('—');
    expect(a.insights.length).toBeGreaterThan(0);
    expect(a.insights.some((s) => s.includes('auto-setoran'))).toBe(true);
  });
});

describe('simulateBoost', () => {
  const goals: GoalInput[] = [
    goal({ id: 1, name: 'A', target_amount: 12_000_000, current_amount: 0 }),
    goal({ id: 2, name: 'B', target_amount: 12_000_000, current_amount: 0 }),
  ];
  const analysis = analyzeGoalsPortfolio(goals, new Map([[1, 500_000], [2, 0]]), 2_000_000, TODAY);

  it('extra 0 = tanpa perubahan ETA', () => {
    const b = simulateBoost(analysis, 0, TODAY);
    expect(b.totalMonthsSaved).toBe(0);
    expect(b.onTimeAfter).toBe(b.onTimeBefore);
  });

  it('extra dibagi proporsional ke kebutuhan setoran', () => {
    const b = simulateBoost(analysis, 1_000_000, TODAY);
    const rowA = b.rows.find((r) => r.id === 1)!;
    const rowB = b.rows.find((r) => r.id === 2)!;
    // kebutuhan A dan B identik -> share 50:50
    expect(rowA.extraPerMonth).toBeCloseTo(500_000, 0);
    expect(rowB.extraPerMonth).toBeCloseTo(500_000, 0);
    expect(rowA.newPerMonth).toBeCloseTo(1_000_000, 0);
  });

  it('extra mempercepat ETA dan menaikkan jumlah on-time', () => {
    const b = simulateBoost(analysis, 5_000_000, TODAY);
    expect(b.totalMonthsSaved).toBeGreaterThan(0);
    expect(b.onTimeAfter).toBeGreaterThan(b.onTimeBefore);
  });

  it('overCapacity true saat total beban melebihi kapasitas', () => {
    const b = simulateBoost(analysis, 5_000_000, TODAY);
    expect(b.overCapacity).toBe(true);
  });
});
