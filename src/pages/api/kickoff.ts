import type { APIRoute } from 'astro';
import { db, getRecurringTransactions, insertTransaction, upsertMonthlyIncome, getMonthlyIncome, ensurePeriod, getPeriodByMonth } from '../../lib/db';

// Resolve a recurring item's day-of-month (created_at, 1-28) to a created_time ISO string
// inside the given period ("September 2026" = Aug 21 → Sep 20). Days >= 21 belong to the
// previous calendar month. Mirrors the mapping documented in the FinDash skill.
function recurringCreatedTime(created_at: string | null | undefined, month: string): string {
  const targetDate = new Date(month + ' 1');
  let day = parseInt(created_at || '', 10);
  if (!(day >= 1 && day <= 28)) day = 21;
  if (day >= 21) targetDate.setMonth(targetDate.getMonth() - 1);
  targetDate.setDate(day);
  return targetDate.toISOString();
}

async function kickoffIntoPeriod(opts: {
  period_id: number; month: string; salary: number; dateStr: string; skipExistingTitles: boolean;
}): Promise<Response> {
  const { period_id, month, salary, dateStr, skipExistingTitles } = opts;
  upsertMonthlyIncome({ period_id, date: dateStr, income: salary, other_income: 0 });

  const allRecurring = getRecurringTransactions().filter((r: any) => r.active === 1);
  const recurring = allRecurring.filter((r: any) => {
    if (!r.end_date) return true;
    const endDate = new Date(r.end_date + ' 1');
    const newPeriodDate = new Date(month + ' 1');
    return endDate >= newPeriodDate;
  });

  let existingTitles: Set<string> | null = null;
  if (skipExistingTitles) {
    existingTitles = new Set(
      (db.prepare('SELECT title FROM transactions WHERE period_id = ?').all(period_id) as any[]).map(r => r.title)
    );
  }

  let added = 0;
  for (const r of recurring) {
    if (existingTitles?.has(r.title)) continue;
    insertTransaction({
      period_id, date: dateStr,
      title: r.title, category: r.category, amount: r.amount, currency: 'IDR',
      type: r.type, payment_method: r.payment_method || 'Cash',
      done: r.done ? 1 : 0, created_time: recurringCreatedTime(r.created_at, month),
    });
    added++;
  }

  // Auto-generate credit card payment from previous period's credit expenses
  let ccPaymentAmount = 0;
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
        period_id, date: dateStr,
        title: `CC Payment — ${prevPeriod.month}`,
        category: 'Credit Card', amount: creditTotal, currency: 'IDR',
        type: 'credit_payment', payment_method: 'Credit Card',
        done: 0, created_time: new Date().toISOString(),
      });
      ccPaymentAmount = creditTotal;
    }
  }

  return new Response(JSON.stringify({
    success: true, month, period_id, salary,
    preloaded: added,
    skippedExisting: recurring.length - added,
    ccPaymentAmount,
    ccPaymentNote: ccPaymentAmount > 0 ? 'Added CC Payment from previous period' : null,
  }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async () => {
  // Latest kicked-off period = one with an income record (kickoff marker).
  const latestPeriod = db.prepare(`
    SELECT p.id, p.month 
    FROM periods p
    WHERE p.id IN (SELECT DISTINCT period_id FROM monthly_income)
    ORDER BY p.start_date DESC LIMIT 1
  `).get() as any;
  const latestMonth = latestPeriod?.month || null;

  // Offer kickoff ONLY for the period active TODAY (21st → 20th salary cycle),
  // and only if it has no income record yet. Never "latest + 1" — that skips
  // months when a manual transaction landed in the active period before kickoff.
  // ponytail: if the user skips kickoff for 2+ months, only the current active
  // period is offered; backfill older ones manually via the API.
  const today = new Date();
  const label = new Date(today.getFullYear(), today.getMonth(), 1);
  if (today.getDate() >= 21) label.setMonth(label.getMonth() + 1);
  const activeMonth = label.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const activePeriod = getPeriodByMonth(activeMonth);
  // No income record for the active period (row missing OR empty) = kickoff needed
  const activeHasIncome = activePeriod
    ? !!db.prepare('SELECT 1 FROM monthly_income WHERE period_id = ?').get(activePeriod.id)
    : false;

  if (activeHasIncome) {
    // Active period already kicked off — hide the banner
    return new Response(JSON.stringify({ latestMonth, nextMonth: null, hasNextMonth: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ latestMonth, nextMonth: activeMonth, hasNextMonth: false }), {
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
  if (existingIncome) {
    // Income record = kickoff marker. Never re-kickoff, never skip ahead.
    return new Response(JSON.stringify({ error: 'Month already kicked off (income record exists)' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (existingTx) {
    // Period has manual transactions but was never kicked off (e.g. user logged a tx
    // into the active period before running kickoff). Kick off INTO this period:
    // add income + recurring items not already present by title. Never skip the month.
    return await kickoffIntoPeriod({ period_id, month, salary, dateStr, skipExistingTitles: true });
  }

  return await kickoffIntoPeriod({ period_id, month, salary, dateStr, skipExistingTitles: false });
};
