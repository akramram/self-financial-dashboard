import type { APIRoute } from 'astro';
import { db, getGoals, getNetworth } from '../../lib/db';
import { analyzeGoalTrajectory, type GoalTrajectoryResult } from '../../lib/goalTrajectory';

/**
 * GET /api/goal-trajectory
 *
 * Projects each active goal's completion date from the user's actual savings
 * trend (net worth growth over the last 6 periods). Returns one projection
 * per active goal plus the underlying trend samples so the client can render
 * a sparkline without a second round-trip.
 *
 * Response shape mirrors `GoalTrajectoryResult` from
 * `src/lib/goalTrajectory.ts`. All period-filtered logic lives in the pure
 * function; this endpoint just wires DB rows in and JSON out.
 */
export const GET: APIRoute = ({ url }) => {
  const goals = getGoals();
  const networth = getNetworth();

  // Optional window-size override (1-24). Defaults to 6 inside the analyzer.
  let windowSize: number | undefined;
  const w = url.searchParams.get('window');
  if (w) {
    const parsed = parseInt(w, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 24) {
      windowSize = parsed;
    }
  }

  const result: GoalTrajectoryResult = analyzeGoalTrajectory(goals, networth, {
    windowSize,
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Touch `db` so server-side tree-shaking keeps the connection alive alongside
// the getGoals/getNetworth reads — harmless no-op otherwise.
void db;
