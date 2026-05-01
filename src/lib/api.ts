import type { Transaction, NetworthRecord, MonthlySummary, Category } from './data';

export async function fetchTransactions(filters?: { month?: string; type?: string; search?: string }): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (filters?.month) params.set('month', filters.month);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.search) params.set('search', filters.search);
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
