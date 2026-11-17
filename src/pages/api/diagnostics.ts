import type { APIRoute } from 'astro';
import { db, getActivePeriodId } from '../../lib/db';
import { runDataDiagnostics } from '../../lib/data-diagnostics';

export const GET: APIRoute = async () => {
  const transactions = db
    .prepare(
      'SELECT id, title, amount, type, category, done, date, created_time, period_id FROM transactions'
    )
    .all();
  const periods = db
    .prepare('SELECT id, month, start_date, end_date FROM periods ORDER BY start_date')
    .all();
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all();

  const report = runDataDiagnostics({
    transactions: transactions as never[],
    periods: periods as never[],
    categories: categories as never[],
    activePeriodId: getActivePeriodId(),
    now: new Date().toISOString(),
  });

  return new Response(JSON.stringify(report), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
