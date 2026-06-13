import type { APIRoute } from 'astro';
import { getTransactions, getNetworth, getMonthlySummary, db, getAllPeriods } from '../../lib/db';

function toCsv(rows: Record<string, any>[], headers: string[]): string {
  const escape = (val: any) => {
    const str = val == null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))];
  return lines.join('\n');
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';
  const type = url.searchParams.get('type') || 'all';
  const dateSuffix = new Date().toISOString().slice(0, 10);

  // Build period_id → month lookup
  const periods = getAllPeriods();
  const periodMap = new Map(periods.map((p: any) => [p.id, p.month]));

  if (format === 'csv') {
    if (type === 'transactions' || type === 'all') {
      const transactions = getTransactions();
      const headers = ['id', 'period_id', 'month', 'date', 'title', 'category', 'amount', 'currency', 'type', 'payment_method', 'done', 'created_time'];
      const rows = transactions.map((t: any) => ({
        id: t.id,
        period_id: t.period_id,
        month: periodMap.get(t.period_id) || '',
        date: t.date,
        title: t.title,
        category: t.category,
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        payment_method: t.payment_method,
        done: t.done ? 1 : 0,
        created_time: t.created_time,
      }));
      const csv = toCsv(rows, headers);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="transactions-${dateSuffix}.csv"`,
        },
      });
    }

    if (type === 'networth') {
      const networth = getNetworth();
      const headers = ['period_id', 'month', 'date', 'total', 'currency', 'month_over_month_change', 'month_over_month_pct'];
      const rows = networth.map((n: any) => ({
        period_id: n.period_id,
        month: n.month,
        date: n.date,
        total: n.total,
        currency: n.currency,
        month_over_month_change: n.month_over_month_change ?? '',
        month_over_month_pct: n.month_over_month_pct ?? '',
      }));
      const csv = toCsv(rows, headers);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="networth-${dateSuffix}.csv"`,
        },
      });
    }

    if (type === 'summary') {
      const monthlySummary = getMonthlySummary();
      const incomeRows = db.prepare(`
        SELECT mi.period_id, mi.income
        FROM monthly_income mi
      `).all() as any[];
      const incomeMap = new Map(incomeRows.map((r) => [r.period_id, r.income]));
      for (const s of monthlySummary) {
        const income = incomeMap.get(s.period_id) || 0;
        s.income = income;
        s.savings = income - s.outcome.total;
        s.savings_rate_pct = income > 0 ? Number(((s.savings / income) * 100).toFixed(2)) : 0;
      }
      const headers = ['period_id', 'month', 'date', 'income', 'outcome_cash', 'outcome_credit_payment', 'outcome_credit_expenses', 'outcome_total', 'savings', 'savings_rate_pct', 'networth'];
      const rows = monthlySummary.map((s: any) => ({
        period_id: s.period_id,
        month: s.month,
        date: s.date,
        income: s.income,
        outcome_cash: s.outcome.cash,
        outcome_credit_payment: s.outcome.credit_payment,
        outcome_credit_expenses: s.outcome.credit_expenses,
        outcome_total: s.outcome.total,
        savings: s.savings,
        savings_rate_pct: s.savings_rate_pct,
        networth: s.networth,
      }));
      const csv = toCsv(rows, headers);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="monthly-summary-${dateSuffix}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid CSV type. Use ?type=transactions|networth|summary' }), { status: 400 });
  }

  // JSON export (default)
  const transactions = getTransactions();
  const networth = getNetworth();
  const monthlySummary = getMonthlySummary();
  const incomeRows = db.prepare(`
    SELECT mi.period_id, mi.income
    FROM monthly_income mi
  `).all() as any[];
  const incomeMap = new Map(incomeRows.map((r) => [r.period_id, r.income]));
  for (const s of monthlySummary) {
    const income = incomeMap.get(s.period_id) || 0;
    s.income = income;
    s.savings = income - s.outcome.total;
    s.savings_rate_pct = income > 0 ? Number(((s.savings / income) * 100).toFixed(2)) : 0;
  }

  const data = {
    transactions,
    networth,
    monthlySummary,
    exportedAt: new Date().toISOString(),
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="financial-data-${dateSuffix}.json"`,
    },
  });
};
