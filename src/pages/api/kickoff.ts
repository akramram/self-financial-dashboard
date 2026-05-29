import type { APIRoute } from 'astro';
import { db, getRecurringTransactions, insertTransaction, upsertMonthlyIncome, getMonthlyIncomeByMonth } from '../../lib/db';

export const GET: APIRoute = async () => {
  // Return the latest month that has transactions or income
  const txMonth = db.prepare("SELECT month FROM transactions ORDER BY date DESC LIMIT 1").get() as any;
  const incomeMonth = db.prepare("SELECT month FROM monthly_income ORDER BY date DESC LIMIT 1").get() as any;
  const latestMonth = txMonth?.month || incomeMonth?.month || null;

  // Compute next month
  let nextMonth: string | null = null;
  if (latestMonth) {
    const d = new Date(latestMonth + ' 1');
    d.setMonth(d.getMonth() + 1);
    nextMonth = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const hasNextMonth = nextMonth ? !!getMonthlyIncomeByMonth(nextMonth) || !!(db.prepare("SELECT 1 FROM transactions WHERE month = ? LIMIT 1").get(nextMonth)) : false;

  return new Response(JSON.stringify({ latestMonth, nextMonth, hasNextMonth }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const month: string = body.month;
  const salary: number = Number(body.salary) || 0;

  if (!month || typeof month !== 'string') {
    return new Response(JSON.stringify({ error: 'Month is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse month to get date — periods start on the 21st (salary cycle)
  const monthDate = new Date(month + ' 1');
  const mm = String(monthDate.getMonth() + 1).padStart(2, '0');
  const yyyy = monthDate.getFullYear();
  const dateStr = `${yyyy}-${mm}-21`;

  // Check if month already has income
  const existingIncome = getMonthlyIncomeByMonth(month);
  const existingTx = db.prepare("SELECT 1 FROM transactions WHERE month = ? LIMIT 1").get(month);
  if (existingIncome || existingTx) {
    return new Response(JSON.stringify({ error: 'Month already exists' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create monthly income record
  upsertMonthlyIncome({
    month,
    date: dateStr,
    income: salary,
    other_income: 0,
  });

  // Insert active recurring transactions
  const recurring = getRecurringTransactions().filter((r: any) => r.active === 1);
  const now = new Date().toISOString();
  for (const r of recurring) {
    insertTransaction({
      month,
      date: dateStr,
      title: r.title,
      category: r.category,
      amount: r.amount,
      currency: 'IDR',
      type: r.type,
      payment_method: r.payment_method || 'Cash',
      done: r.done ? 1 : 0,
      created_time: now,
    });
  }

  return new Response(JSON.stringify({
    success: true,
    month,
    salary,
    preloaded: recurring.length,
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
