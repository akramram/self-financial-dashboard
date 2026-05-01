import transactionsJson from '../data/transactions.json';
import networthJson from '../data/networth.json';
import monthlySummaryJson from '../data/monthly_summary.json';

export interface Transaction {
  id: number;
  month: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  type: 'cash' | 'credit_expense' | 'credit_payment';
  payment_method: string;
  done: boolean;
  created_time: string;
}

export interface NetworthRecord {
  month: string;
  date: string;
  total: number;
  currency: string;
  month_over_month_change: number | null;
  month_over_month_pct: number | null;
  breakdown: Record<string, number>;
}

export interface MonthlySummary {
  month: string;
  date: string;
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

export const initialTransactions: Transaction[] = transactionsJson as Transaction[];
export const initialNetworth: NetworthRecord[] = networthJson as NetworthRecord[];
export const initialMonthlySummary: MonthlySummary[] = monthlySummaryJson as unknown as MonthlySummary[];
