import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calculateInstallment,
  getSubsequentPeriodMonth,
  formatPeriodMonthToYYYYMM,
  convertTransactionToInstallment,
} from '../lib/installment';
import { db, insertTransaction, deleteTransaction, getTransactionById, getPeriodByMonth, ensurePeriod, getTransactions } from '../lib/db';

describe('Installment calculations & helpers', () => {
  it('calculates 0% installment correctly', () => {
    const res = calculateInstallment({
      amount: 6000000,
      months: 6,
      interestPercent: 0,
      adminFee: 25000,
    });

    expect(res.principal).toBe(6000000);
    expect(res.months).toBe(6);
    expect(res.monthlyPrincipal).toBe(1000000);
    expect(res.monthlyInterest).toBe(0);
    expect(res.monthlyAmount).toBe(1000000);
    expect(res.totalInterest).toBe(0);
    expect(res.totalPaid).toBe(6000000);
    expect(res.adminFee).toBe(25000);
  });

  it('calculates percentage interest correctly', () => {
    const res = calculateInstallment({
      amount: 3000000,
      months: 3,
      interestPercent: 1.5, // 1.5% per month
      adminFee: 0,
    });

    // Principal: 3jt, months: 3 -> 1jt pokok / month
    // Interest: 3jt * 1.5% = 45.000 / month
    // Total per month: 1.045.000
    expect(res.monthlyPrincipal).toBe(1000000);
    expect(res.monthlyInterest).toBe(45000);
    expect(res.monthlyAmount).toBe(1045000);
    expect(res.totalInterest).toBe(135000);
    expect(res.totalPaid).toBe(3135000);
  });

  it('calculates flat nominal monthly interest correctly', () => {
    const res = calculateInstallment({
      amount: 2000000,
      months: 4,
      interestFlatMonthly: 20000,
      adminFee: 15000,
    });

    expect(res.monthlyPrincipal).toBe(500000);
    expect(res.monthlyInterest).toBe(20000);
    expect(res.monthlyAmount).toBe(520000);
    expect(res.totalInterest).toBe(80000);
    expect(res.totalPaid).toBe(2080000);
    expect(res.adminFee).toBe(15000);
  });

  it('handles subsequent period month and year rollover', () => {
    expect(getSubsequentPeriodMonth('August 2026', 0)).toBe('August 2026');
    expect(getSubsequentPeriodMonth('August 2026', 1)).toBe('September 2026');
    expect(getSubsequentPeriodMonth('August 2026', 5)).toBe('January 2027');
    expect(getSubsequentPeriodMonth('December 2026', 2)).toBe('February 2027');
  });

  it('formats period month to YYYY-MM correctly', () => {
    expect(formatPeriodMonthToYYYYMM('August 2026')).toBe('2026-08');
    expect(formatPeriodMonthToYYYYMM('January 2027')).toBe('2027-01');
    expect(formatPeriodMonthToYYYYMM('October 2026')).toBe('2026-10');
  });
});

describe('convertTransactionToInstallment integration', () => {
  let testTxId: number;
  const createdTxIds: number[] = [];
  let createdRecurringId: number | null = null;

  beforeEach(() => {
    const periodId = ensurePeriod('August 2026');
    testTxId = insertTransaction({
      title: 'iPad Air M2',
      amount: 9000000,
      category: 'Gadget',
      type: 'credit_expense',
      payment_method: 'BCA Card',
      period_id: periodId,
      date: '2026-08-21',
      created_time: '2026-08-10T14:00:00.000Z',
      done: 1,
      notes: 'Pembelian offline',
    });
    createdTxIds.push(testTxId);

    // Also ensure September 2026 exists
    ensurePeriod('September 2026');
  });

  afterEach(() => {
    for (const id of createdTxIds) {
      deleteTransaction(id);
    }
    if (createdRecurringId) {
      db.prepare('DELETE FROM recurring_transactions WHERE id = ?').run(createdRecurringId);
    }
  });

  it('converts transaction to installment, updates original, creates admin fee, and adds recurring template', () => {
    const result = convertTransactionToInstallment({
      transactionId: testTxId,
      months: 3,
      interestPercent: 1.0, // 1% per month = 90k
      adminFee: 50000,
      startDate: '2026-08-10', // Belongs to August 2026
    });

    createdRecurringId = result.recurringTransactionId;
    if (result.adminFeeTransactionId) createdTxIds.push(result.adminFeeTransactionId);
    createdTxIds.push(...result.generatedTransactionIds);

    expect(result.originalTransactionId).toBe(testTxId);
    expect(result.months).toBe(3);
    expect(result.startPeriodMonth).toBe('August 2026');
    expect(result.endPeriodMonth).toBe('October 2026');

    // Pokok: 9jt / 3 = 3jt, Bunga: 90k -> Monthly: 3.090.000
    expect(result.monthlyAmount).toBe(3090000);

    // Verify original transaction is updated to Cicilan 1/3
    const updatedOriginal = getTransactionById(testTxId);
    expect(updatedOriginal.title).toBe('Cicilan iPad Air M2 (1/3)');
    expect(updatedOriginal.amount).toBe(3090000);
    expect(updatedOriginal.notes).toContain('Cicilan 1/3');
    expect(updatedOriginal.created_time).toContain('2026-08-10');

    // Verify admin fee transaction
    expect(result.adminFeeTransactionId).not.toBeNull();
    const adminTx = getTransactionById(result.adminFeeTransactionId!);
    expect(adminTx).toBeTruthy();
    expect(adminTx.title).toBe('Biaya Admin Cicilan - iPad Air M2');
    expect(adminTx.amount).toBe(50000);

    // Verify existing September 2026 received Cicilan 2/3
    const sepPeriod = getPeriodByMonth('September 2026');
    expect(sepPeriod).toBeTruthy();
    const sepTxs = getTransactions({ periodId: sepPeriod.id, search: 'Cicilan iPad Air M2 (2/3)' });
    expect(sepTxs.length).toBe(1);
    expect(sepTxs[0].amount).toBe(3090000);

    // Verify recurring transaction created
    const recurringRow = db.prepare('SELECT * FROM recurring_transactions WHERE id = ?').get(result.recurringTransactionId) as any;
    expect(recurringRow).toBeTruthy();
    expect(recurringRow.title).toBe('Cicilan iPad Air M2');
    expect(recurringRow.amount).toBe(3090000);
    expect(recurringRow.end_date).toBe('2026-10');
    expect(recurringRow.active).toBe(1);
  });

  it('handles backdating to an earlier period properly', () => {
    // Original tx was in August 2026, but user backdates to June 2026
    ensurePeriod('June 2026');
    ensurePeriod('July 2026');

    const result = convertTransactionToInstallment({
      transactionId: testTxId,
      months: 4,
      interestPercent: 0,
      adminFee: 20000,
      startDate: '2026-06-10', // Belongs to June 2026
    });

    createdRecurringId = result.recurringTransactionId;
    if (result.adminFeeTransactionId) createdTxIds.push(result.adminFeeTransactionId);
    createdTxIds.push(...result.generatedTransactionIds);

    expect(result.startPeriodMonth).toBe('June 2026');
    expect(result.endPeriodMonth).toBe('September 2026');
    expect(result.monthlyAmount).toBe(2250000); // 9jt / 4

    // Original moved to June 2026 period
    const junePeriod = getPeriodByMonth('June 2026');
    const updatedOriginal = getTransactionById(testTxId);
    expect(updatedOriginal.period_id).toBe(junePeriod.id);
    expect(updatedOriginal.title).toBe('Cicilan iPad Air M2 (1/4)');

    // Admin fee in June 2026
    const adminTx = getTransactionById(result.adminFeeTransactionId!);
    expect(adminTx.period_id).toBe(junePeriod.id);

    // July, August, September have generated transactions
    const julyPeriod = getPeriodByMonth('July 2026');
    const julyTxs = getTransactions({ periodId: julyPeriod.id, search: 'Cicilan iPad Air M2 (2/4)' });
    expect(julyTxs.length).toBe(1);

    const augPeriod = getPeriodByMonth('August 2026');
    const augTxs = getTransactions({ periodId: augPeriod.id, search: 'Cicilan iPad Air M2 (3/4)' });
    expect(augTxs.length).toBe(1);

    const sepPeriod = getPeriodByMonth('September 2026');
    const sepTxs = getTransactions({ periodId: sepPeriod.id, search: 'Cicilan iPad Air M2 (4/4)' });
    expect(sepTxs.length).toBe(1);

    // Recurring end date
    const recurringRow = db.prepare('SELECT * FROM recurring_transactions WHERE id = ?').get(result.recurringTransactionId) as any;
    expect(recurringRow.end_date).toBe('2026-09');
  });
});
