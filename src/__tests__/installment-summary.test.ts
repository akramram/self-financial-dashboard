import { describe, it, expect } from 'vitest';
import {
  formatYYYYMMToPeriodMonth,
  parseYYYYMM,
  extractTenorFromTitle,
  cleanInstallmentTitle,
  summarizeInstallments,
} from '../lib/installment-summary';
import type { RecurringTransaction, Transaction } from '../lib/data';

describe('installment-summary unit tests', () => {
  it('formats YYYY-MM to Period Month string correctly', () => {
    expect(formatYYYYMMToPeriodMonth('2026-12')).toBe('December 2026');
    expect(formatYYYYMMToPeriodMonth('2026-01')).toBe('January 2026');
    expect(formatYYYYMMToPeriodMonth('2025-08')).toBe('August 2025');
  });

  it('parses YYYY-MM properly', () => {
    expect(parseYYYYMM('2026-10')).toEqual({ year: 2026, month: 10 });
    expect(parseYYYYMM('invalid')).toBeNull();
  });

  it('extracts tenor from title format (k/N)', () => {
    expect(extractTenorFromTitle('Cicilan Hybrid Inverter (1/3)')).toEqual({ current: 1, total: 3 });
    expect(extractTenorFromTitle('iPhone 15 Pro (6/12)')).toEqual({ current: 6, total: 12 });
    expect(extractTenorFromTitle('Belanja Bulanan')).toBeNull();
  });

  it('cleans installment title prefix and suffix', () => {
    expect(cleanInstallmentTitle('Cicilan Hybrid Inverter (1/3)')).toBe('Hybrid Inverter');
    expect(cleanInstallmentTitle('Installment Laptop Asus (2/12)')).toBe('Laptop Asus');
    expect(cleanInstallmentTitle('Cicilan Tyranno')).toBe('Tyranno');
  });

  it('summarizes active installments with tenor and remaining liability', () => {
    const recurring: RecurringTransaction[] = [
      {
        id: 1,
        title: 'Cicilan Hybrid Inverter',
        category: 'Belanja Pribadi',
        amount: 1100910,
        type: 'credit_expense',
        payment_method: 'Credit',
        done: false,
        active: true,
        end_date: '2026-12',
        created_at: '15',
      },
      {
        id: 2,
        title: 'Cicilan Tyranno',
        category: 'Tagihan',
        amount: 1293194,
        type: 'credit_expense',
        payment_method: 'Credit',
        done: false,
        active: true,
        end_date: null,
        created_at: '17',
      },
      {
        id: 3,
        title: 'Internet Bulanan',
        category: 'Tagihan',
        amount: 350000,
        type: 'credit_expense',
        payment_method: 'Credit',
        done: false,
        active: true,
        end_date: null, // not an installment (no cicilan keyword, no end_date)
        created_at: '21',
      },
      {
        id: 4,
        title: 'Expired Cicilan',
        category: 'Tagihan',
        amount: 500000,
        type: 'credit_expense',
        payment_method: 'Credit',
        done: false,
        active: true,
        end_date: '2026-05', // in the past relative to October 2026
        created_at: '10',
      },
    ];

    const transactions: Transaction[] = [
      {
        id: 101,
        period_id: 1,
        month: 'September 2026',
        date: '2026-09-21',
        title: 'Cicilan Hybrid Inverter (1/3)',
        category: 'Belanja Pribadi',
        amount: 1100910,
        currency: 'IDR',
        type: 'credit_expense',
        payment_method: 'Credit',
        done: true,
        created_time: '2026-09-21T12:00:00.000Z',
        notes: 'Cicilan 1/3 (Pokok: Rp 1.100.910)',
      },
      {
        id: 102,
        period_id: 2,
        month: 'October 2026',
        date: '2026-10-21',
        title: 'Cicilan Hybrid Inverter (2/3)',
        category: 'Belanja Pribadi',
        amount: 1100910,
        currency: 'IDR',
        type: 'credit_expense',
        payment_method: 'Credit',
        done: false,
        created_time: '2026-10-21T12:00:00.000Z',
      },
      {
        id: 201,
        period_id: 1,
        month: 'September 2026',
        date: '2026-09-21',
        title: 'Cicilan Tyranno',
        category: 'Tagihan',
        amount: 1293194,
        currency: 'IDR',
        type: 'credit_expense',
        payment_method: 'Credit',
        done: true,
        created_time: '2026-09-21T12:00:00.000Z',
      },
    ];

    const summary = summarizeInstallments({
      recurring,
      transactions,
      currentPeriodMonth: 'October 2026',
    });

    expect(summary.activeCount).toBe(2); // Hybrid Inverter + Tyranno
    expect(summary.monthlyObligation).toBe(1100910 + 1293194); // 2394104

    const inverter = summary.items.find((i) => i.id === 1);
    expect(inverter).toBeDefined();
    expect(inverter?.totalTenor).toBe(3);
    expect(inverter?.paidTenor).toBe(1);
    expect(inverter?.remainingTenor).toBe(2);
    expect(inverter?.estimatedRemainingAmount).toBe(2 * 1100910);
    expect(inverter?.isCompleted).toBe(false);

    const expired = summary.items.find((i) => i.id === 4);
    expect(expired?.isCompleted).toBe(true);
  });
});
