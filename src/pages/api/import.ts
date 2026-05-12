import type { APIRoute } from 'astro';
import { insertTransaction, upsertNetworth, upsertMonthlyIncome } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { type, rows } = body;

    if (!type || !Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: 'Missing type or rows' }), { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    if (type === 'transactions') {
      for (const row of rows) {
        try {
          if (!row.month || !row.date || !row.title || !row.category || row.amount == null || !row.type) {
            errors++;
            continue;
          }
          const validTypes = ['cash', 'credit_expense', 'credit_payment'];
          const txType = String(row.type);
          if (!validTypes.includes(txType)) {
            errors++;
            continue;
          }
          insertTransaction({
            month: String(row.month),
            date: String(row.date),
            title: String(row.title),
            category: String(row.category),
            amount: Number(row.amount),
            currency: String(row.currency || 'IDR'),
            type: txType,
            payment_method: String(row.payment_method || 'unknown'),
            done: row.done === true || row.done === 1 || row.done === '1' ? 1 : 0,
            created_time: row.created_time || new Date().toISOString(),
          });
          imported++;
        } catch {
          errors++;
        }
      }
    } else if (type === 'networth') {
      for (const row of rows) {
        try {
          if (!row.month || !row.date || row.total == null) {
            errors++;
            continue;
          }
          upsertNetworth({
            month: String(row.month),
            date: String(row.date),
            total: Number(row.total),
            currency: String(row.currency || 'IDR'),
            month_over_month_change: row.month_over_month_change != null ? Number(row.month_over_month_change) : null,
            month_over_month_pct: row.month_over_month_pct != null ? Number(row.month_over_month_pct) : null,
            breakdown: row.breakdown || {},
          });
          imported++;
        } catch {
          errors++;
        }
      }
    } else if (type === 'monthly_income') {
      for (const row of rows) {
        try {
          if (!row.month || !row.date || row.income == null) {
            errors++;
            continue;
          }
          upsertMonthlyIncome({
            month: String(row.month),
            date: String(row.date),
            income: Number(row.income),
            other_income: row.other_income != null ? Number(row.other_income) : 0,
          });
          imported++;
        } catch {
          errors++;
        }
      }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid import type' }), { status: 400 });
    }

    return new Response(JSON.stringify({ imported, skipped, errors }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Import failed' }), { status: 500 });
  }
};
