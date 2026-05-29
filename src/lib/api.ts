import type { Transaction, NetworthRecord, MonthlySummary, Category } from './data';

export async function fetchTransactions(filters?: { month?: string; type?: string; search?: string; category?: string }): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (filters?.month) params.set('month', filters.month);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.category) params.set('category', filters.category);
  const res = await fetch(`/api/transactions?${params.toString()}`);
  return res.json();
}

export async function fetchTransaction(id: number): Promise<Transaction> {
  const res = await fetch(`/api/transactions/${id}`);
  return res.json();
}

export async function createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx),
  });
  return res.json();
}

export async function updateTransactionApi(id: number, tx: Partial<Transaction>): Promise<void> {
  await fetch(`/api/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx),
  });
}

export async function toggleTransactionDoneApi(id: number, done: boolean): Promise<void> {
  await fetch(`/api/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done }),
  });
}

export async function deleteTransactionApi(id: number): Promise<void> {
  await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
}

export async function fetchNetworth(): Promise<NetworthRecord[]> {
  const res = await fetch('/api/networth');
  return res.json();
}

export async function createNetworth(record: NetworthRecord): Promise<void> {
  await fetch('/api/networth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
}

export async function updateNetworthApi(month: string, record: Partial<NetworthRecord>): Promise<void> {
  await fetch(`/api/networth/${encodeURIComponent(month)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
}

export async function deleteNetworthApi(month: string): Promise<void> {
  await fetch(`/api/networth/${encodeURIComponent(month)}`, { method: 'DELETE' });
}

export async function fetchSummaries(): Promise<MonthlySummary[]> {
  const res = await fetch('/api/summary');
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories');
  return res.json();
}

export async function createCategory(cat: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cat),
  });
  return res.json();
}

export async function updateCategoryApi(id: number, cat: Partial<Omit<Category, 'id' | 'created_at'>>): Promise<void> {
  await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cat),
  });
}

export async function deleteCategoryApi(id: number): Promise<void> {
  await fetch(`/api/categories/${id}`, { method: 'DELETE' });
}

export async function deleteTransactionsBulkApi(ids: number[]): Promise<void> {
  await fetch('/api/transactions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

export interface MonthlyIncome {
  month: string;
  date: string;
  income: number;
  other_income: number;
}

export async function fetchMonthlyIncome(): Promise<MonthlyIncome[]> {
  const res = await fetch('/api/income');
  return res.json();
}

export async function upsertMonthlyIncomeApi(record: Omit<MonthlyIncome, 'other_income'> & { other_income?: number }): Promise<void> {
  await fetch('/api/income', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
}

export async function updateMonthlyIncomeApi(month: string, record: Partial<MonthlyIncome>): Promise<void> {
  await fetch(`/api/income/${encodeURIComponent(month)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
}

export async function deleteMonthlyIncomeApi(month: string): Promise<void> {
  await fetch(`/api/income/${encodeURIComponent(month)}`, { method: 'DELETE' });
}

export interface RecurringTransaction {
  id: number;
  title: string;
  category: string;
  amount: number;
  type: 'cash' | 'credit_expense' | 'credit_payment';
  payment_method: string;
  done: boolean;
  active: boolean;
  created_at: string;
}

export async function fetchRecurringTransactions(): Promise<RecurringTransaction[]> {
  const res = await fetch('/api/recurring');
  return res.json();
}

export async function createRecurringTransaction(tx: Omit<RecurringTransaction, 'id' | 'created_at'>): Promise<RecurringTransaction> {
  const res = await fetch('/api/recurring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx),
  });
  return res.json();
}

export async function updateRecurringTransactionApi(id: number, tx: Partial<Omit<RecurringTransaction, 'id' | 'created_at'>>): Promise<void> {
  await fetch(`/api/recurring/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx),
  });
}

export async function deleteRecurringTransactionApi(id: number): Promise<void> {
  await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
}

export interface KickoffStatus {
  latestMonth: string | null;
  nextMonth: string | null;
  hasNextMonth: boolean;
}

export interface FinancialGoal {
  id: number;
  name: string;
  description: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  target_date: string;
  color: string;
  icon: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchKickoffStatus(): Promise<KickoffStatus> {
  const res = await fetch('/api/kickoff');
  return res.json();
}

export interface KickoffResult {
  success: boolean;
  month: string;
  salary: number;
  preloaded: number;
}

export async function kickoffMonth(month: string, salary: number): Promise<KickoffResult> {
  const res = await fetch('/api/kickoff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, salary }),
  });
  return res.json();
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

export async function importDataApi(type: 'transactions' | 'networth' | 'monthly_income', rows: any[]): Promise<ImportResult> {
  const res = await fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, rows }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(err.error || 'Import failed');
  }
  return res.json();
}

// ─── Goals API ───────────────────────────────────────────────────────────────

export async function fetchGoals(): Promise<FinancialGoal[]> {
  const res = await fetch('/api/goals');
  return res.json();
}

export async function createGoalApi(goal: Omit<FinancialGoal, 'id' | 'completed' | 'created_at' | 'updated_at'>): Promise<{ id: number }> {
  const res = await fetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create goal' }));
    throw new Error(err.error || 'Failed to create goal');
  }
  return res.json();
}

export async function updateGoalApi(id: number, goal: Partial<FinancialGoal>): Promise<void> {
  await fetch(`/api/goals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  });
}

export async function deleteGoalApi(id: number): Promise<void> {
  await fetch(`/api/goals/${id}`, { method: 'DELETE' });
}
