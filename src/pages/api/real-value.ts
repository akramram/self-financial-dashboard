import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import {
  buildRawRows,
  type RealValueIncomeRow,
  type RealValueNetworthRow,
  type RealValuePeriod,
  type RealValueTx,
} from '../../lib/real-value-engine';

// Read-only: raw per-period rows. Inflation math runs client-side so the rate
// slider recomputes instantly without refetching.
export const GET: APIRoute = async () => {
  const periods = db
    .prepare('SELECT id, month, start_date FROM periods ORDER BY start_date')
    .all() as unknown as RealValuePeriod[];
  const txs = db
    .prepare('SELECT amount, type, done, period_id FROM transactions')
    .all() as unknown as RealValueTx[];
  const incomes = db
    .prepare('SELECT period_id, income, other_income FROM monthly_income')
    .all() as unknown as RealValueIncomeRow[];
  const networthRows = db
    .prepare('SELECT period_id, total FROM networth')
    .all() as unknown as RealValueNetworthRow[];

  const rows = buildRawRows(periods, txs, incomes, networthRows);
  return new Response(JSON.stringify({ rows }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
