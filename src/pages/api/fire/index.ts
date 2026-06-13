import type { APIRoute } from 'astro';
import { db, getMonthlySummary, getNetworth } from '../../../lib/db';

interface FireParams {
  withdrawalRate: number;   // e.g., 0.04 = 4%
  expectedReturn: number;   // e.g., 0.07 = 7%
  inflation: number;        // e.g., 0.03 = 3%
}

interface FireResult {
  // Inputs from user data
  monthlyExpenses: number;
  annualExpenses: number;
  monthlyIncome: number;
  monthlySavings: number;
  currentNetworth: number;
  savingsRate: number;

  // Calculated
  fireNumber: number;           // Target amount needed
  progressPct: number;          // Current networth / fireNumber * 100
  yearsToFi: number | null;     // null if already FI or no savings
  projectedFiDate: string | null;
  monthlyContributionNeeded: number;

  // Projection data points for chart
  projection: Array<{
    year: number;
    date: string;
    balance: number;
    contributions: number;
    returns: number;
  }>;

  // Input params echoed back
  params: FireParams;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  
  // Parse adjustable params from query, with defaults
  const withdrawalRate = parseFloat(url.searchParams.get('wr') || '4') / 100;
  const expectedReturn = parseFloat(url.searchParams.get('er') || '7') / 100;
  const inflation = parseFloat(url.searchParams.get('inf') || '3') / 100;

  // Clamp values to reasonable ranges
  const params: FireParams = {
    withdrawalRate: Math.max(0.02, Math.min(0.10, withdrawalRate)),
    expectedReturn: Math.max(0.01, Math.min(0.15, expectedReturn)),
    inflation: Math.max(0, Math.min(0.08, inflation)),
  };

  // Get latest financial data
  const summaries = getMonthlySummary();
  const networthRecords = getNetworth();
  
  if (summaries.length === 0) {
    return new Response(JSON.stringify({ 
      error: 'No financial data available. Add transactions and income first.' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const latestSummary = summaries[summaries.length - 1];
  const latestNetworth = networthRecords.length > 0 
    ? networthRecords[networthRecords.length - 1] 
    : null;

  // Get income (now uses period_id, joined with periods for month lookup)
  const incomeRows = db.prepare(`
    SELECT mi.period_id, mi.income, p.month
    FROM monthly_income mi JOIN periods p ON mi.period_id = p.id
  `).all() as any[];
  const incomeMap = new Map(incomeRows.map((r) => [r.period_id, r.income]));
  const monthlyIncome = incomeMap.get(latestSummary.period_id) || 0;

  // Calculate core metrics
  const monthlyExpenses = latestSummary.outcome.total;
  const annualExpenses = monthlyExpenses * 12;
  const currentNetworth = latestNetworth?.total || 0;
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 
    ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 
    : 0;

  // FIRE number: annual expenses / withdrawal rate (4% rule = 25x annual expenses)
  const fireNumber = params.withdrawalRate > 0 
    ? annualExpenses / params.withdrawalRate 
    : annualExpenses * 25;

  const progressPct = fireNumber > 0 
    ? Math.min(100, (currentNetworth / fireNumber) * 100) 
    : 0;

  // Calculate years to FI using compound interest formula
  // Real return = (1 + nominal_return) / (1 + inflation) - 1 ≈ nominal - inflation
  const realReturn = (1 + params.expectedReturn) / (1 + params.inflation) - 1;
  
  let yearsToFi: number | null = null;
  let projectedFiDate: string | null = null;
  const projection: FireResult['projection'] = [];

  if (monthlySavings > 0 && fireNumber > currentNetworth && realReturn > 0) {
    // NPER formula: =LN((PMT - FV*r) / (PMT - PV*r)) / LN(1+r)
    // where PMT = -monthly_savings, PV = -current_networth, FV = fire_number, r = monthly_rate
    const monthlyRate = realReturn / 12;
    const pmt = -monthlySavings;
    const pv = -currentNetworth;
    const fv = fireNumber;

    // Using the financial formula: NPER(rate, pmt, pv, fv)
    // nper = ln((pmt - fv*r) / (pmt - pv*r)) / ln(1+r)
    const numerator = pmt - fv * monthlyRate;
    const denominator = pmt - pv * monthlyRate;
    
    if (numerator > 0 && denominator > 0 && monthlyRate > 0) {
      const months = Math.log(numerator / denominator) / Math.log(1 + monthlyRate);
      yearsToFi = Math.ceil((months / 12) * 10) / 10; // Round to 1 decimal

      // Calculate projected FI date
      const now = new Date();
      const fiDate = new Date(now);
      fiDate.setFullYear(fiDate.getFullYear() + Math.ceil(yearsToFi));
      projectedFiDate = fiDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    }

    // Generate projection data (yearly data points)
    const maxYears = Math.min(60, Math.ceil(yearsToFi || 30) + 5);
    let currentBalance = currentNetworth;
    let totalContributions = 0;

    for (let year = 0; year <= maxYears; year++) {
      const yearStartBalance = currentBalance;
      let yearContributions = 0;
      let yearReturns = 0;

      // Simulate monthly compounding
      for (let m = 0; m < 12; m++) {
        currentBalance += monthlySavings;
        yearContributions += monthlySavings;
        const monthlyReturn = currentBalance * monthlyRate;
        currentBalance += monthlyReturn;
        yearReturns += monthlyReturn;
      }

      totalContributions += yearContributions;

      const projectedDate = new Date();
      projectedDate.setFullYear(projectedDate.getFullYear() + year);

      projection.push({
        year,
        date: projectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        balance: Math.round(currentBalance),
        contributions: Math.round(totalContributions),
        returns: Math.round(currentBalance - totalContributions - currentNetworth),
      });

      // Stop after we've passed the FI number and shown a few more years
      if (currentBalance >= fireNumber && year >= (yearsToFi || 30)) {
        break;
      }
    }
  } else if (currentNetworth >= fireNumber) {
    // Already FI!
    yearsToFi = 0;
    projectedFiDate = 'Now — You are already financially independent! 🎉';
    
    // Still show a few years of projection
    let currentBalance = currentNetworth;
    let totalContributions = 0;
    const monthlyRate = realReturn / 12;

    for (let year = 0; year <= 5; year++) {
      let yearContributions = 0;
      for (let m = 0; m < 12; m++) {
        currentBalance += Math.max(0, monthlySavings);
        yearContributions += Math.max(0, monthlySavings);
        currentBalance += currentBalance * monthlyRate;
      }
      totalContributions += yearContributions;

      const projectedDate = new Date();
      projectedDate.setFullYear(projectedDate.getFullYear() + year);

      projection.push({
        year,
        date: projectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        balance: Math.round(currentBalance),
        contributions: Math.round(totalContributions),
        returns: Math.round(currentBalance - totalContributions - currentNetworth),
      });
    }
  }

  // Monthly contribution needed if savings are negative
  const monthlyContributionNeeded = fireNumber > currentNetworth && realReturn > 0
    ? Math.max(0, (fireNumber - currentNetworth * Math.pow(1 + realReturn / 12, 12 * 10)) / 
        ((Math.pow(1 + realReturn / 12, 12 * 10) - 1) / (realReturn / 12)))
    : 0;

  const result: FireResult = {
    monthlyExpenses,
    annualExpenses,
    monthlyIncome,
    monthlySavings,
    currentNetworth,
    savingsRate: Math.round(savingsRate * 10) / 10,
    fireNumber,
    progressPct: Math.round(progressPct * 10) / 10,
    yearsToFi,
    projectedFiDate,
    monthlyContributionNeeded: Math.round(monthlyContributionNeeded),
    projection,
    params,
  };

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};
