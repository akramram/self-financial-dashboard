import type { RecurringTransaction, Transaction } from './data';
import { MONTH_NAMES } from './installment-calc';

export interface ActiveInstallmentItem {
  id: number;
  title: string;
  cleanTitle: string;
  category: string;
  monthlyAmount: number;
  totalTenor: number | null;
  paidTenor: number;
  remainingTenor: number | null;
  endDate: string | null; // YYYY-MM
  endPeriodMonth: string | null; // e.g. "December 2026"
  estimatedRemainingAmount: number | null;
  billingDay: string;
  active: boolean;
  isCompleted: boolean;
  notes?: string;
}

export interface InstallmentSummary {
  activeCount: number;
  monthlyObligation: number;
  totalRemainingLiability: number;
  items: ActiveInstallmentItem[];
}

export function formatYYYYMMToPeriodMonth(yyyymm: string): string {
  const parts = yyyymm.trim().split('-');
  if (parts.length < 2) return yyyymm;
  const yearStr = parts[0];
  const mIdx = parseInt(parts[1], 10) - 1;
  const monthName = MONTH_NAMES[mIdx] || parts[1];
  return `${monthName} ${yearStr}`;
}

export function parseYYYYMM(str: string): { year: number; month: number } | null {
  const m = str.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
}

export function extractTenorFromTitle(title: string): { current: number; total: number } | null {
  const match = title.match(/\((\d+)\/(\d+)\)/);
  if (!match) return null;
  const current = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  if (isNaN(current) || isNaN(total) || total <= 0) return null;
  return { current, total };
}

export function cleanInstallmentTitle(title: string): string {
  return title
    .replace(/^cicilan\s+/i, '')
    .replace(/^installment\s+/i, '')
    .replace(/\s*\(\d+\/\d+\)$/, '')
    .trim();
}

export interface SummarizeInstallmentsInput {
  recurring: RecurringTransaction[];
  transactions: Transaction[];
  currentPeriodMonth?: string | null; // e.g. "October 2026"
}

export function summarizeInstallments(input: SummarizeInstallmentsInput): InstallmentSummary {
  const { recurring = [], transactions = [], currentPeriodMonth } = input;

  // Determine reference YYYY-MM for active status calculation
  let currentYYYYMM = '';
  if (currentPeriodMonth) {
    const parts = currentPeriodMonth.trim().split(' ');
    if (parts.length >= 2) {
      const idx = MONTH_NAMES.indexOf(parts[0]);
      if (idx !== -1) {
        currentYYYYMM = `${parts[1]}-${String(idx + 1).padStart(2, '0')}`;
      }
    }
  }
  if (!currentYYYYMM) {
    const now = new Date();
    currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const items: ActiveInstallmentItem[] = [];

  for (const r of recurring) {
    // Only credit card recurring transactions can be credit card installments
    if (r.type !== 'credit_expense') continue;

    const isCicilanPattern = /cicilan|installment/i.test(r.title);
    const hasEndDate = Boolean(r.end_date);

    if (!isCicilanPattern && !hasEndDate) continue;

    const clean = cleanInstallmentTitle(r.title);
    const cleanLower = clean.toLowerCase();

    // Check completion based on end_date
    let isCompleted = false;
    let endPeriodMonth: string | null = null;
    let monthsRemainingFromEndDate: number | null = null;

    if (r.end_date) {
      endPeriodMonth = formatYYYYMMToPeriodMonth(r.end_date);
      if (r.end_date < currentYYYYMM) {
        isCompleted = true;
      } else {
        const cur = parseYYYYMM(currentYYYYMM);
        const end = parseYYYYMM(r.end_date);
        if (cur && end) {
          const diff = (end.year - cur.year) * 12 + (end.month - cur.month) + 1;
          monthsRemainingFromEndDate = Math.max(1, diff);
        }
      }
    }

    // Match transactions
    const matched = transactions.filter((t) => {
      if (t.type !== 'credit_expense') return false;
      const tClean = cleanInstallmentTitle(t.title).toLowerCase();
      return tClean === cleanLower || tClean.includes(cleanLower) || cleanLower.includes(tClean);
    });

    let detectedTotalTenor: number | null = null;
    let latestCurrentTenor: number | null = null;
    let matchedNotes = '';

    for (const t of matched) {
      const tenor = extractTenorFromTitle(t.title);
      if (tenor) {
        if (!detectedTotalTenor || tenor.total > detectedTotalTenor) {
          detectedTotalTenor = tenor.total;
        }
        if (!latestCurrentTenor || tenor.current > latestCurrentTenor) {
          latestCurrentTenor = tenor.current;
        }
      }
      if (t.notes && !matchedNotes && t.notes.includes('Cicilan')) {
        matchedNotes = t.notes;
      }
    }

    const paidCount = matched.filter((t) => t.done).length;

    let remainingTenor: number | null = null;
    let estimatedRemainingAmount: number | null = null;

    if (detectedTotalTenor !== null) {
      // If we have total tenor from title (e.g. 1/3)
      const effectivePaid = Math.max(paidCount, latestCurrentTenor !== null ? latestCurrentTenor - 1 : 0);
      remainingTenor = Math.max(0, detectedTotalTenor - effectivePaid);
      estimatedRemainingAmount = remainingTenor * r.amount;
      if (remainingTenor === 0) {
        isCompleted = true;
      }
    } else if (monthsRemainingFromEndDate !== null) {
      // Use remaining months computed from end_date
      remainingTenor = monthsRemainingFromEndDate;
      estimatedRemainingAmount = remainingTenor * r.amount;
    }

    items.push({
      id: r.id,
      title: r.title,
      cleanTitle: clean || r.title,
      category: r.category,
      monthlyAmount: r.amount,
      totalTenor: detectedTotalTenor,
      paidTenor: paidCount,
      remainingTenor,
      endDate: r.end_date,
      endPeriodMonth,
      estimatedRemainingAmount,
      billingDay: r.created_at || '21',
      active: Boolean(r.active),
      isCompleted,
      notes: matchedNotes || undefined,
    });
  }

  // Active items: active in recurring and not completed
  const activeItems = items.filter((it) => it.active && !it.isCompleted);
  const activeCount = activeItems.length;
  const monthlyObligation = activeItems.reduce((acc, it) => acc + it.monthlyAmount, 0);
  const totalRemainingLiability = activeItems.reduce((acc, it) => {
    return acc + (it.estimatedRemainingAmount !== null ? it.estimatedRemainingAmount : it.monthlyAmount);
  }, 0);

  return {
    activeCount,
    monthlyObligation,
    totalRemainingLiability,
    items,
  };
}
