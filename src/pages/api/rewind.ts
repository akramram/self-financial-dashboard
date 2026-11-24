import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import {
  availableRewindYears,
  buildRewindReport,
  type RewindIncomeRow,
  type RewindNetworthRow,
  type RewindPeriod,
  type RewindTx,
} from '../../lib/rewind-analytics';

export const GET: APIRoute = async ({ url }) => {
  const periods = db
    .prepare('SELECT id, month, start_date FROM periods ORDER BY start_date')
    .all() as unknown as RewindPeriod[];
  const txs = db
    .prepare('SELECT title, category, amount, type, done, period_id FROM transactions')
    .all() as unknown as RewindTx[];
  const incomes = db
    .prepare('SELECT period_id, income, other_income FROM monthly_income')
    .all() as unknown as RewindIncomeRow[];
  const networthRows = db
    .prepare('SELECT period_id, total FROM networth')
    .all() as unknown as RewindNetworthRow[];

  const years = availableRewindYears(periods);
  const requested = Number(url.searchParams.get('year'));
  const year = years.includes(requested) ? requested : years[0];
  if (!year) {
    return new Response(JSON.stringify({ years, report: null }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const report = buildRewindReport(year, periods, txs, incomes, networthRows);
  return new Response(JSON.stringify({ years, report }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
