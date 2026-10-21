export interface InstallmentCalculationInput {
  amount: number;
  months: number;
  interestPercent?: number; // e.g. 1.25 for 1.25% per month
  interestFlatMonthly?: number; // flat nominal rupiah per month
  adminFee?: number; // one-time admin fee rupiah
}

export interface InstallmentCalculationResult {
  principal: number;
  months: number;
  interestPercent: number;
  monthlyPrincipal: number;
  monthlyInterest: number;
  monthlyAmount: number;
  totalInterest: number;
  totalPaid: number;
  adminFee: number;
}

export function calculateInstallment(input: InstallmentCalculationInput): InstallmentCalculationResult {
  const principal = Math.max(0, Math.round(input.amount || 0));
  const months = Math.max(2, Math.floor(input.months || 2));
  const adminFee = Math.max(0, Math.round(input.adminFee || 0));

  const monthlyPrincipal = Math.floor(principal / months);

  let monthlyInterest = 0;
  let interestPercent = 0;
  if (input.interestPercent !== undefined && input.interestPercent > 0) {
    interestPercent = input.interestPercent;
    monthlyInterest = Math.round(principal * (interestPercent / 100));
  } else if (input.interestFlatMonthly !== undefined && input.interestFlatMonthly > 0) {
    monthlyInterest = Math.round(input.interestFlatMonthly);
    interestPercent = principal > 0 ? (monthlyInterest / principal) * 100 : 0;
  }

  const monthlyAmount = monthlyPrincipal + monthlyInterest;
  const totalInterest = monthlyInterest * months;
  const totalPaid = monthlyAmount * months;

  return {
    principal,
    months,
    interestPercent: Number(interestPercent.toFixed(2)),
    monthlyPrincipal,
    monthlyInterest,
    monthlyAmount,
    totalInterest,
    totalPaid,
    adminFee,
  };
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getSubsequentPeriodMonth(periodMonth: string, offsetMonths: number): string {
  const parts = periodMonth.trim().split(' ');
  const monthName = parts[0];
  const year = parseInt(parts[1], 10);
  const idx = MONTH_NAMES.indexOf(monthName);
  if (idx === -1) throw new Error(`Unknown period month: ${periodMonth}`);
  const d = new Date(year, idx + offsetMonths, 1);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatPeriodMonthToYYYYMM(periodMonth: string): string {
  const parts = periodMonth.trim().split(' ');
  const monthName = parts[0];
  const year = parseInt(parts[1], 10);
  const idx = MONTH_NAMES.indexOf(monthName);
  if (idx === -1) throw new Error(`Unknown period month: ${periodMonth}`);
  const m = String(idx + 1).padStart(2, '0');
  return `${year}-${m}`;
}
