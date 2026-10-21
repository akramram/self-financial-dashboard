import { db, getTransactionById, updateTransaction, insertTransaction, insertRecurringTransaction, ensurePeriod, getPeriodById, getPeriodByMonth } from './db';
import { periodForDate } from './utils';
import {
  calculateInstallment,
  getSubsequentPeriodMonth,
  formatPeriodMonthToYYYYMM,
  type InstallmentCalculationInput,
  type InstallmentCalculationResult,
} from './installment-calc';

export {
  calculateInstallment,
  getSubsequentPeriodMonth,
  formatPeriodMonthToYYYYMM,
  type InstallmentCalculationInput,
  type InstallmentCalculationResult,
};

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
      currency: tx.currency || 'IDR',
      type: tx.type,
      payment_method: tx.payment_method,
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
