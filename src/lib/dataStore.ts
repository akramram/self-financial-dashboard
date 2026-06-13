import {
  initialTransactions,
  initialNetworth,
  initialMonthlySummary,
  type Transaction,
  type NetworthRecord,
  type MonthlySummary,
} from './data';

const STORAGE_KEYS = {
  transactions: 'fd_transactions',
  networth: 'fd_networth',
  monthlySummary: 'fd_monthly_summary',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

function saveToStorage<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function getTransactions(): Transaction[] {
  return loadFromStorage(STORAGE_KEYS.transactions, initialTransactions);
}

export function saveTransactions(data: Transaction[]) {
  saveToStorage(STORAGE_KEYS.transactions, data);
}

export function addTransaction(tx: Omit<Transaction, 'id'>): Transaction {
  const all = getTransactions();
  const maxId = all.length > 0 ? Math.max(...all.map((t) => t.id)) : 0;
  const newTx: Transaction = { ...tx, id: maxId + 1 };
  const updated = [...all, newTx];
  saveTransactions(updated);
  recalcSummaries();
  return newTx;
}

export function deleteTransaction(id: number) {
  const all = getTransactions().filter((t) => t.id !== id);
  saveTransactions(all);
  recalcSummaries();
}

export function updateTransaction(updated: Transaction) {
  const all = getTransactions().map((t) => (t.id === updated.id ? updated : t));
  saveTransactions(all);
  recalcSummaries();
}

export function getNetworth(): NetworthRecord[] {
  return loadFromStorage(STORAGE_KEYS.networth, initialNetworth);
}

export function saveNetworth(data: NetworthRecord[]) {
  saveToStorage(STORAGE_KEYS.networth, data);
}

function recalcNetworthMoM(records: NetworthRecord[]): NetworthRecord[] {
  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      sorted[i].month_over_month_change = null;
      sorted[i].month_over_month_pct = null;
    } else {
      const prev = sorted[i - 1].total;
      sorted[i].month_over_month_change = Number((sorted[i].total - prev).toFixed(2));
      sorted[i].month_over_month_pct = prev > 0 ? Number((((sorted[i].total - prev) / prev) * 100).toFixed(2)) : null;
    }
  }
  return sorted;
}

export function addNetworth(record: NetworthRecord) {
  const all = getNetworth();
  const idx = all.findIndex((n) => n.period_id === record.period_id);
  let updated: NetworthRecord[];
  if (idx >= 0) {
    updated = [...all];
    updated[idx] = record;
  } else {
    updated = [...all, record];
  }
  updated = recalcNetworthMoM(updated);
  saveNetworth(updated);
  recalcSummaries();
}

export function updateNetworthRecord(periodId: number, breakdown: Record<string, number>) {
  const all = getNetworth();
  const idx = all.findIndex((n) => n.period_id === periodId);
  if (idx < 0) return;
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  all[idx] = { ...all[idx], breakdown, total };
  const updated = recalcNetworthMoM(all);
  saveNetworth(updated);
  recalcSummaries();
}

export function getMonthlySummary(): MonthlySummary[] {
  return loadFromStorage(STORAGE_KEYS.monthlySummary, initialMonthlySummary);
}

export function saveMonthlySummary(data: MonthlySummary[]) {
  saveToStorage(STORAGE_KEYS.monthlySummary, data);
}

function getMonthDate(monthName: string): string {
  const monthMap: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, oktober: 10,
    november: 11, december: 12, month: 1,
  };
  const parts = monthName.toLowerCase().split(' ');
  let year = 2024;
  let monthNum = 1;
  for (const part of parts) {
    if (monthMap[part]) monthNum = monthMap[part];
    else if (/^\d+$/.test(part)) year = parseInt(part, 10);
  }
  return `${year}-${String(monthNum).padStart(2, '0')}-01`;
}

export function recalcSummaries() {
  const transactions = getTransactions();
  const networth = getNetworth();
  const months = Array.from(new Set(transactions.map((t) => t.month)));
  months.sort((a, b) => {
    const da = new Date(getMonthDate(a));
    const db = new Date(getMonthDate(b));
    return da.getTime() - db.getTime();
  });

  const summaries: MonthlySummary[] = months.map((month, idx) => {
    const monthTx = transactions.filter((t) => t.month === month);
    const cash = monthTx.filter((t) => t.type === 'cash').reduce((s, t) => s + t.amount, 0);
    const credit_payment = monthTx.filter((t) => t.type === 'credit_payment').reduce((s, t) => s + t.amount, 0);
    const credit_expenses = monthTx.filter((t) => t.type === 'credit_expense').reduce((s, t) => s + t.amount, 0);
    const total_outcome = cash + credit_payment;

    const existing = initialMonthlySummary.find((m) => m.month === month);
    const income = existing?.income ?? 0;
    const savings = income - total_outcome;
    const savings_rate = income > 0 ? Number(((savings / income) * 100).toFixed(2)) : 0;

    const category_totals: Record<string, number> = {};
    monthTx
      .filter((t) => t.type === 'cash' || t.type === 'credit_expense')
      .forEach((t) => {
        category_totals[t.category] = (category_totals[t.category] ?? 0) + t.amount;
      });

    const nw = networth.find((n) => n.month === month);

    // Use a synthetic period_id based on array index + 1
    const period_id = monthTx[0]?.period_id ?? (idx + 1);

    return {
      period_id,
      month,
      date: getMonthDate(month),
      income,
      outcome: {
        cash,
        credit_payment,
        credit_expenses,
        total: total_outcome,
      },
      savings,
      savings_rate_pct: savings_rate,
      networth: nw?.total ?? 0,
      category_totals,
    };
  });

  saveMonthlySummary(summaries);
}

export function exportAllData() {
  if (typeof window === 'undefined') return;
  const data = {
    transactions: getTransactions(),
    networth: getNetworth(),
    monthlySummary: getMonthlySummary(),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financial-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAllData(jsonText: string) {
  const data = JSON.parse(jsonText);
  if (data.transactions) saveTransactions(data.transactions);
  if (data.networth) saveNetworth(data.networth);
  if (data.monthlySummary) saveMonthlySummary(data.monthlySummary);
}

export function resetToDefault() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.transactions);
  localStorage.removeItem(STORAGE_KEYS.networth);
  localStorage.removeItem(STORAGE_KEYS.monthlySummary);
  window.location.reload();
}
