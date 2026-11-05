/**
 * Debt Payoff Simulator & Credit Health Engine
 * Computes Snowball vs Avalanche payoff trajectories,
 * credit utilization health, and installment cash flow liberation milestones.
 */

import { MONTH_NAMES } from './installment-calc';
import { formatYYYYMMToPeriodMonth } from './installment-summary';

export interface DebtItem {
  id: string | number;
  title: string;
  category: string;
  balance: number;
  monthlyPayment: number;
  interestRateAnnual?: number; // percentage, e.g. 21 for 21%
  type: 'credit_card' | 'installment';
  endDate?: string | null; // YYYY-MM
  remainingTenor?: number | null;
}

export interface PayoffScheduleMonth {
  monthIndex: number;
  monthLabel: string;
  remainingDebt: number;
  monthlyPayment: number;
  debtItemsRemaining: number;
}

export interface ItemPayoffOrder {
  id: string | number;
  title: string;
  payoffMonthIndex: number;
  payoffDate: string;
  startingBalance: number;
}

export interface PayoffSimulationResult {
  strategy: 'snowball' | 'avalanche';
  totalStartingDebt: number;
  monthlyBaseBudget: number;
  extraMonthlyPayment: number;
  totalMonthlyBudget: number;
  monthsToPayoff: number;
  payoffDate: string;
  totalInterestOrAdmin: number;
  totalPaid: number;
  interestSavedVsBaseline: number;
  monthsSavedVsBaseline: number;
  monthlySchedule: PayoffScheduleMonth[];
  itemPayoffOrder: ItemPayoffOrder[];
}

export interface CreditHealthMetrics {
  totalLimit: number;
  totalBalance: number;
  utilizationRate: number;
  utilizationStatus: 'optimal' | 'moderate' | 'high' | 'critical';
  dtiRatio: number;
  dtiStatus: 'healthy' | 'moderate' | 'caution';
  monthlyObligation: number;
  unpaidExpensesCount: number;
  unpaidExpensesTotal: number;
  activeInstallmentsCount: number;
  activeInstallmentsTotalMonthly: number;
  recommendation: string;
}

export interface CashFlowMilestone {
  monthYear: string;
  dateKey: string;
  completedItems: Array<{ title: string; monthlyAmount: number }>;
  monthlyAmountLiberated: number;
  cumulativeAmountLiberated: number;
  remainingMonthlyObligation: number;
}

/**
 * Format target date from start date + month offset
 */
export function getOffsetMonthLabel(startDate: Date, offsetMonths: number): string {
  const d = new Date(startDate.getFullYear(), startDate.getMonth() + offsetMonths, 1);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Compute debt payoff simulation under Snowball or Avalanche strategies.
 */
export function calculateDebtPayoffSchedule(
  debtItems: DebtItem[],
  extraMonthlyPayment: number = 0,
  strategy: 'snowball' | 'avalanche' = 'avalanche',
  startDate: Date = new Date()
): PayoffSimulationResult {
  const validDebts = debtItems
    .filter((item) => item.balance > 0)
    .map((item) => ({
      ...item,
      currentBalance: Math.round(item.balance),
      minPayment: Math.max(10000, Math.round(item.monthlyPayment || item.balance * 0.1)),
      rate: (item.interestRateAnnual ?? (item.type === 'credit_card' ? 21 : 0)) / 100 / 12,
    }));

  const totalStartingDebt = validDebts.reduce((sum, d) => sum + d.currentBalance, 0);
  const baselineMonthlyObligation = validDebts.reduce((sum, d) => sum + d.minPayment, 0);

  if (totalStartingDebt === 0) {
    return {
      strategy,
      totalStartingDebt: 0,
      monthlyBaseBudget: 0,
      extraMonthlyPayment: 0,
      totalMonthlyBudget: 0,
      monthsToPayoff: 0,
      payoffDate: getOffsetMonthLabel(startDate, 0),
      totalInterestOrAdmin: 0,
      totalPaid: 0,
      interestSavedVsBaseline: 0,
      monthsSavedVsBaseline: 0,
      monthlySchedule: [
        {
          monthIndex: 0,
          monthLabel: getOffsetMonthLabel(startDate, 0),
          remainingDebt: 0,
          monthlyPayment: 0,
          debtItemsRemaining: 0,
        },
      ],
      itemPayoffOrder: [],
    };
  }

  // Helper simulation runner
  function runSimulation(extra: number, strat: 'snowball' | 'avalanche') {
    const items = validDebts.map((d) => ({ ...d }));
    let month = 0;
    let totalInterest = 0;
    let totalPaid = 0;
    const schedule: PayoffScheduleMonth[] = [];
    const payoffOrder: ItemPayoffOrder[] = [];
    const maxMonths = 360; // 30 year safety cap

    // Initial state (month 0)
    schedule.push({
      monthIndex: 0,
      monthLabel: getOffsetMonthLabel(startDate, 0),
      remainingDebt: totalStartingDebt,
      monthlyPayment: 0,
      debtItemsRemaining: items.length,
    });

    while (month < maxMonths) {
      const active = items.filter((it) => it.currentBalance > 0);
      if (active.length === 0) break;

      month += 1;
      const monthLabel = getOffsetMonthLabel(startDate, month);

      // Accrue interest on revolving credit items
      let monthlyInterestThisMonth = 0;
      for (const it of active) {
        if (it.rate > 0) {
          const interest = Math.round(it.currentBalance * it.rate);
          it.currentBalance += interest;
          monthlyInterestThisMonth += interest;
        }
      }
      totalInterest += monthlyInterestThisMonth;

      // Determine available total payment pool
      // As items finish, minimum payments are rolled over into the snowball/avalanche
      let availablePayment = baselineMonthlyObligation + extra;
      let monthActualPaid = 0;

      // 1. Pay minimum payments first
      for (const it of active) {
        const payment = Math.min(it.currentBalance, it.minPayment);
        it.currentBalance -= payment;
        availablePayment -= payment;
        monthActualPaid += payment;

        if (it.currentBalance <= 0) {
          it.currentBalance = 0;
          if (!payoffOrder.some((p) => p.id === it.id)) {
            payoffOrder.push({
              id: it.id,
              title: it.title,
              payoffMonthIndex: month,
              payoffDate: monthLabel,
              startingBalance: it.balance,
            });
          }
        }
      }

      // 2. Direct surplus payment to target debt according to strategy
      // Snowball: lowest balance first
      // Avalanche: highest interest rate first (then lowest balance tiebreaker)
      const remainingUnpaid = items.filter((it) => it.currentBalance > 0);
      if (remainingUnpaid.length > 0 && availablePayment > 0) {
        remainingUnpaid.sort((a, b) => {
          if (strat === 'avalanche') {
            if (b.rate !== a.rate) return b.rate - a.rate;
            return a.currentBalance - b.currentBalance;
          }
          return a.currentBalance - b.currentBalance;
        });

        for (const target of remainingUnpaid) {
          if (availablePayment <= 0) break;
          const extraPay = Math.min(target.currentBalance, availablePayment);
          target.currentBalance -= extraPay;
          availablePayment -= extraPay;
          monthActualPaid += extraPay;

          if (target.currentBalance <= 0) {
            target.currentBalance = 0;
            if (!payoffOrder.some((p) => p.id === target.id)) {
              payoffOrder.push({
                id: target.id,
                title: target.title,
                payoffMonthIndex: month,
                payoffDate: monthLabel,
                startingBalance: target.balance,
              });
            }
          }
        }
      }

      totalPaid += monthActualPaid;
      const currentRemainingTotal = items.reduce((sum, it) => sum + it.currentBalance, 0);

      schedule.push({
        monthIndex: month,
        monthLabel,
        remainingDebt: currentRemainingTotal,
        monthlyPayment: monthActualPaid,
        debtItemsRemaining: items.filter((it) => it.currentBalance > 0).length,
      });

      if (currentRemainingTotal <= 0) break;
    }

    return {
      months: month,
      totalInterest,
      totalPaid,
      schedule,
      payoffOrder,
    };
  }

  // Run baseline simulation (0 extra payment)
  const baseline = runSimulation(0, strategy);
  // Run current simulation with user-selected extra payment
  const current = runSimulation(extraMonthlyPayment, strategy);

  const interestSaved = Math.max(0, baseline.totalInterest - current.totalInterest);
  const monthsSaved = Math.max(0, baseline.months - current.months);

  return {
    strategy,
    totalStartingDebt,
    monthlyBaseBudget: baselineMonthlyObligation,
    extraMonthlyPayment,
    totalMonthlyBudget: baselineMonthlyObligation + extraMonthlyPayment,
    monthsToPayoff: current.months,
    payoffDate: getOffsetMonthLabel(startDate, current.months),
    totalInterestOrAdmin: current.totalInterest,
    totalPaid: current.totalPaid,
    interestSavedVsBaseline: interestSaved,
    monthsSavedVsBaseline: monthsSaved,
    monthlySchedule: current.schedule,
    itemPayoffOrder: current.payoffOrder,
  };
}

/**
 * Calculate credit health indicators and debt ratios.
 */
export function calculateCreditHealth(input: {
  totalCreditLimit: number;
  outstandingBalance: number;
  monthlyIncome: number;
  unpaidExpensesCount: number;
  unpaidExpensesTotal: number;
  activeInstallmentsCount: number;
  activeInstallmentsTotalMonthly: number;
}): CreditHealthMetrics {
  const {
    totalCreditLimit = 15000000,
    outstandingBalance = 0,
    monthlyIncome = 0,
    unpaidExpensesCount = 0,
    unpaidExpensesTotal = 0,
    activeInstallmentsCount = 0,
    activeInstallmentsTotalMonthly = 0,
  } = input;

  const totalBalance = Math.max(0, outstandingBalance);
  const limit = Math.max(1000000, totalCreditLimit);
  const utilizationRate = Math.min(100, Math.round((totalBalance / limit) * 100));

  let utilizationStatus: CreditHealthMetrics['utilizationStatus'] = 'optimal';
  if (utilizationRate > 75) {
    utilizationStatus = 'critical';
  } else if (utilizationRate > 50) {
    utilizationStatus = 'high';
  } else if (utilizationRate > 30) {
    utilizationStatus = 'moderate';
  }

  const monthlyObligation = activeInstallmentsTotalMonthly + unpaidExpensesTotal;
  const dtiRatio = monthlyIncome > 0 ? Math.round((monthlyObligation / monthlyIncome) * 100) : 0;

  let dtiStatus: CreditHealthMetrics['dtiStatus'] = 'healthy';
  if (dtiRatio > 36) {
    dtiStatus = 'caution';
  } else if (dtiRatio > 20) {
    dtiStatus = 'moderate';
  }

  let recommendation = 'Kesehatan kartu kredit optimal. Pertahankan pemanfaatan limit di bawah 30%.';
  if (utilizationStatus === 'critical') {
    recommendation = 'Pemanfaatan limit sangat tinggi (>75%). Segera bayar tagihan untuk menjaga skor kredit.';
  } else if (utilizationStatus === 'high') {
    recommendation = 'Penggunaan di atas 50%. Prioritaskan pembayaran sebelum tanggal cetak tagihan.';
  } else if (utilizationStatus === 'moderate') {
    recommendation = 'Penggunaan berada pada batas moderat (30% - 50%). Aman namun disarankan kurangi saldo berjalan.';
  } else if (dtiStatus === 'caution') {
    recommendation = 'Beban cicilan dan utang bulanan melebihi 36% dari penghasilan. Hindari menambah komitmen cicilan baru.';
  }

  return {
    totalLimit: limit,
    totalBalance,
    utilizationRate,
    utilizationStatus,
    dtiRatio,
    dtiStatus,
    monthlyObligation,
    unpaidExpensesCount,
    unpaidExpensesTotal,
    activeInstallmentsCount,
    activeInstallmentsTotalMonthly,
    recommendation,
  };
}

/**
 * Generate Chronological Cash Flow Liberation Milestones from Active Installments.
 */
export function generateInstallmentMilestones(
  installments: Array<{
    title: string;
    monthlyAmount: number;
    endDate: string | null; // YYYY-MM
    endPeriodMonth?: string | null;
    active: boolean;
    isCompleted?: boolean;
  }>
): CashFlowMilestone[] {
  const activeItems = installments.filter((it) => it.active && !it.isCompleted && it.endDate);
  if (activeItems.length === 0) return [];

  // Group by endDate (YYYY-MM)
  const map = new Map<string, Array<{ title: string; monthlyAmount: number }>>();
  for (const it of activeItems) {
    if (!it.endDate) continue;
    const key = it.endDate.trim();
    const existing = map.get(key) || [];
    existing.push({ title: it.title, monthlyAmount: it.monthlyAmount });
    map.set(key, existing);
  }

  const sortedKeys = Array.from(map.keys()).sort();
  const totalMonthlyObligation = activeItems.reduce((sum, it) => sum + it.monthlyAmount, 0);

  let cumulativeLiberated = 0;
  const milestones: CashFlowMilestone[] = [];

  for (const dateKey of sortedKeys) {
    const items = map.get(dateKey) || [];
    const monthlyAmountLiberated = items.reduce((sum, it) => sum + it.monthlyAmount, 0);
    cumulativeLiberated += monthlyAmountLiberated;
    const remainingObligation = Math.max(0, totalMonthlyObligation - cumulativeLiberated);

    milestones.push({
      dateKey,
      monthYear: formatYYYYMMToPeriodMonth(dateKey),
      completedItems: items,
      monthlyAmountLiberated,
      cumulativeAmountLiberated: cumulativeLiberated,
      remainingMonthlyObligation: remainingObligation,
    });
  }

  return milestones;
}
