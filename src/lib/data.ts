import transactionsJson from '../data/transactions.json';
import networthJson from '../data/networth.json';
import monthlySummaryJson from '../data/monthly_summary.json';

export interface Transaction {
  id: number;
  period_id: number;
  month: string;  // display label, kept for backward compat
  date: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  type: 'cash' | 'credit_expense' | 'credit_payment';
  payment_method: string;
  done: boolean;
  created_time: string;
  notes?: string;
}

export interface NetworthRecord {
  period_id: number;
  month: string;  // display label from periods table
  date: string;
  total: number;
  currency: string;
  month_over_month_change: number | null;
  month_over_month_pct: number | null;
  breakdown: Record<string, number>;
}

export interface MonthlySummary {
  period_id: number;
  month: string;  // display label
  date: string;
  start_date?: string;
  end_date?: string;
  income: number;
  outcome: {
    cash: number;
    credit_payment: number;
    credit_expenses: number;
    total: number;
  };
  savings: number;
  savings_rate_pct: number;
  networth: number;
  category_totals: Record<string, number>;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  monthly_limit: number;
  created_at: string;
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

export interface Investment {
  id: number;
  name: string;
  ticker: string;
  type: 'stock' | 'crypto' | 'etf' | 'bond' | 'mutual_fund' | 'real_estate' | 'other';
  quantity: number;
  avg_purchase_price: number;
  current_price: number;
  currency: string;
  platform: string;
  notes: string;
  purchase_date: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  holdingsCount: number;
  byType: Record<string, { invested: number; currentValue: number; count: number }>;
}

export const initialTransactions: Transaction[] = transactionsJson as Transaction[];
export const initialNetworth: NetworthRecord[] = networthJson as NetworthRecord[];
export const initialMonthlySummary: MonthlySummary[] = monthlySummaryJson as unknown as MonthlySummary[];
