import type { APIRoute } from 'astro';
import { db, getRecurringTransactions, insertTransaction, upsertMonthlyIncome, getMonthlyIncome, ensurePeriod, getPeriodByMonth } from '../../lib/db';

export const GET: APIRoute = async () => {
  // Return the latest period that has transactions or income
  const latestPeriod = db.prepare(`
    SELECT p.id, p.month 
    FROM periods p
    WHERE p.id IN (SELECT DISTINCT period_id FROM transactions)
       OR p.id IN (SELECT DISTINCT period_id FROM monthly_income)
    ORDER BY p.start_date DESC LIMIT 1
  `).get() as any;

  const latestMonth = latestPeriod?.month || null;

  // Compute next month
  let nextMonth: string | null = null;
  let nextPeriodId: number | null = null;
  if (latestMonth) {
    const d = new Date(latestMonth + ' 1');
    d.setMonth(d.getMonth() + 1);
    nextMonth = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const nextPeriod = getPeriodByMonth(nextMonth);
    nextPeriodId = nextPeriod?.id ?? null;
  }

  const hasNextMonth = nextPeriodId ? true : false;

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

  // Ensure period exists
  const period_id = ensurePeriod(month);

  // Parse month to get date — periods start on the 21st (salary cycle)
  const monthDate = new Date(month + ' 1');
  const mm = String(monthDate.getMonth() + 1).padStart(2, '0');
  const yyyy = monthDate.getFullYear();
  const dateStr = `${yyyy}-${mm}-21`;

  // Check if period already has income or transactions
  const existingIncome = db.prepare('SELECT 1 FROM monthly_income WHERE period_id = ?').get(period_id);
  const existingTx = db.prepare('SELECT 1 FROM transactions WHERE period_id = ? LIMIT 1').get(period_id);
  if (existingIncome || existingTx) {
    return new Response(JSON.stringify({ error: 'Month already exists' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create monthly income record
  upsertMonthlyIncome({
    period_id,
    date: dateStr,
    income: salary,
    other_income: 0,
  });

  // Insert active recurring transactions (skip those past end_date)
  const allRecurring = getRecurringTransactions().filter((r: any) => r.active === 1);
  const recurring = allRecurring.filter((r: any) => {
    if (!r.end_date) return true;
    const endDate = new Date(r.end_date + ' 1');
    const newPeriodDate = new Date(month + ' 1');
    return endDate >= newPeriodDate;
  });
  for (const r of recurring) {
    // Use recurring created_at day number (1-28) for the transaction's created_time
    // Periods run 21st→20th. Days >=21 belong to the previous calendar month.
    let createdTime: string;
    if (r.created_at) {
      const day = parseInt(r.created_at, 10);
      if (day >= 1 && day <= 28) {
        const targetDate = new Date(month + ' 1'); // e.g. "August 2026" → Aug 1
        if (day >= 21) {
          targetDate.setMonth(targetDate.getMonth() - 1); // shift to July
        }
        targetDate.setDate(day);
        createdTime = targetDate.toISOString();
      } else {
        createdTime = new Date().toISOString();
      }
    } else {
      // Default to 21st = previous calendar month
      const targetDate = new Date(month + ' 1');
      targetDate.setMonth(targetDate.getMonth() - 1);
      targetDate.setDate(21);
      createdTime = targetDate.toISOString();
    }
    insertTransaction({
      period_id,
      date: dateStr,
      title: r.title,
      category: r.category,
      amount: r.amount,
      currency: 'IDR',
      type: r.type,
      payment_method: r.payment_method || 'Cash',
      done: r.done ? 1 : 0,
      created_time: createdTime,
    });
  }

  let ccPaymentAmount = 0;
  // Auto-generate credit card payment from previous period's credit expenses
  const allPeriods = db.prepare('SELECT * FROM periods ORDER BY start_date ASC').all() as any[];
  const currentIdx = allPeriods.findIndex((p: any) => p.month === month);
  if (currentIdx > 0) {
    const prevPeriod = allPeriods[currentIdx - 1];
    const creditStatus = db.prepare(`
      SELECT SUM(CASE WHEN type = 'credit_expense' THEN amount ELSE 0 END) AS credit_expenses_total
      FROM transactions WHERE period_id = ?
    `).get(prevPeriod.id) as any;
    const creditTotal = creditStatus?.credit_expenses_total || 0;
    if (creditTotal > 0) {
      insertTransaction({
        period_id,
        date: dateStr,
        title: `CC Payment — ${prevPeriod.month}`,
        category: 'Credit Card',
        amount: creditTotal,
        currency: 'IDR',
        type: 'credit_payment',
        payment_method: 'Credit Card',
        done: 0,
        created_time: new Date().toISOString(),
      });
      ccPaymentAmount = creditTotal;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    month,
    period_id,
    salary,
    preloaded: recurring.length,
    ccPaymentAmount,
    ccPaymentNote: ccPaymentAmount > 0 ? `Added CC Payment from previous period` : null,
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
