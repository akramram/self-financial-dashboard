import { db, getTransactionById, updateTransaction, insertTransaction, insertRecurringTransaction, ensurePeriod, getPeriodById, getPeriodByMonth } from './db';
import { periodForDate } from './utils';

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
  const principal = Math.max(0, Math.round(input.amount));
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

const MONTH_NAMES = [
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

export interface ConvertToInstallmentOptions {
  transactionId: number;
  months: number;
  interestPercent?: number;
  interestFlatMonthly?: number;
  adminFee?: number;
  startDate: string; // YYYY-MM-DD
}

export interface ConvertToInstallmentResult {
  originalTransactionId: number;
  months: number;
  monthlyAmount: number;
  adminFeeTransactionId: number | null;
  recurringTransactionId: number;
  generatedTransactionIds: number[];
  startPeriodMonth: string;
  endPeriodMonth: string;
}

export function convertTransactionToInstallment(options: ConvertToInstallmentOptions): ConvertToInstallmentResult {
  const { transactionId, months, interestPercent, interestFlatMonthly, adminFee, startDate } = options;

  if (!transactionId || typeof transactionId !== 'number') {
    throw new Error('Valid transaction ID is required');
  }
  if (!months || months < 2) {
    throw new Error('Duration must be at least 2 months');
  }
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new Error('Valid start date (YYYY-MM-DD) is required');
  }

  const tx = getTransactionById(transactionId);
  if (!tx) {
    throw new Error(`Transaction #${transactionId} not found`);
  }

  const calc = calculateInstallment({
    amount: tx.amount,
    months,
    interestPercent,
    interestFlatMonthly,
    adminFee,
  });

  const p = periodForDate(startDate);
  if (!p) {
    throw new Error(`Cannot determine period for date: ${startDate}`);
  }
  const startPeriodMonth = `${p.month} ${p.year}`;

  const cleanTitle = tx.title
    .replace(/^cicilan\s+/i, '')
    .replace(/\s*\(\d+\/\d+\)$/, '')
    .trim();
  const installmentTitle = `Cicilan ${cleanTitle}`;

  // Execute DB changes atomically
  const runTransaction = db.transaction(() => {
    const startPeriodId = ensurePeriod(startPeriodMonth);
    const startPeriod = getPeriodById(startPeriodId);

    // 1. Update original transaction into Installment 1 / N
    const firstNotes = [
      tx.notes,
      `Cicilan 1/${calc.months} (Pokok: Rp ${calc.monthlyPrincipal.toLocaleString('id-ID')} + Bunga: Rp ${calc.monthlyInterest.toLocaleString('id-ID')}). Total pokok asli: Rp ${calc.principal.toLocaleString('id-ID')}.`,
    ].filter(Boolean).join(' | ');

    updateTransaction(tx.id, {
      title: `${installmentTitle} (1/${calc.months})`,
      amount: calc.monthlyAmount,
      period_id: startPeriodId,
      date: startPeriod?.start_date || `${startDate.slice(0, 7)}-21`,
      created_time: `${startDate}T12:00:00.000Z`,
      notes: firstNotes,
    });

    // 2. Insert admin fee transaction if > 0 (separate item)
    let adminTxId: number | null = null;
    if (calc.adminFee > 0) {
      adminTxId = insertTransaction({
        title: `Biaya Admin Cicilan - ${cleanTitle}`,
        category: tx.category,
        amount: calc.adminFee,
        currency: tx.currency || 'IDR',
        type: tx.type,
        payment_method: tx.payment_method,
        period_id: startPeriodId,
        date: startPeriod?.start_date || `${startDate.slice(0, 7)}-21`,
        created_time: `${startDate}T12:05:00.000Z`,
        done: 1,
        notes: `Biaya administrasi konversi cicilan ${cleanTitle} (${calc.months} bulan)`,
      });
    }

    // 3. For months 2..N: if period exists in periods table, insert transaction
    const generatedTransactionIds: number[] = [];
    for (let k = 2; k <= calc.months; k++) {
      const monthPeriodName = getSubsequentPeriodMonth(startPeriodMonth, k - 1);
      const existingPeriod = getPeriodByMonth(monthPeriodName);
      if (existingPeriod) {
        const txId = insertTransaction({
          title: `${installmentTitle} (${k}/${calc.months})`,
          category: tx.category,
          amount: calc.monthlyAmount,
          currency: tx.currency || 'IDR',
          type: tx.type,
          payment_method: tx.payment_method,
          period_id: existingPeriod.id,
          date: existingPeriod.start_date,
          created_time: `${existingPeriod.start_date}T12:00:00.000Z`,
          done: 0,
          notes: `Cicilan ${k}/${calc.months}`,
        });
        generatedTransactionIds.push(txId);
      }
    }

    // 4. Create recurring transaction template
    const endPeriodMonth = getSubsequentPeriodMonth(startPeriodMonth, calc.months - 1);
    const endMonthYYYYMM = formatPeriodMonthToYYYYMM(endPeriodMonth);
    const startDay = String(new Date(`${startDate}T12:00:00`).getDate()).padStart(2, '0');

    const recurringId = insertRecurringTransaction({
      title: installmentTitle,
      category: tx.category,
      amount: calc.monthlyAmount,
      type: tx.type,
      payment_method: tx.payment_method,
      done: 0,
      active: 1,
      end_date: endMonthYYYYMM,
      created_at: startDay,
    });

    return {
      originalTransactionId: tx.id,
      months: calc.months,
      monthlyAmount: calc.monthlyAmount,
      adminFeeTransactionId: adminTxId,
      recurringTransactionId: recurringId,
      generatedTransactionIds,
      startPeriodMonth,
      endPeriodMonth,
    };
  });

  return runTransaction();
}
