import { db } from '../src/lib/db';

// Check what analysis features already exist
console.log('=== ALL PAGES ===');
const pages = ['/', '/analytics', '/calendar', '/cashflow', '/compare', '/credit-card', '/dna', 
  '/fire', '/forecast', '/goals', '/health', '/merchants', '/networth', '/portfolio',
  '/recommendations', '/recurring', '/recurring-audit', '/report', '/savings-rate',
  '/settings', '/spending-mix', '/spending-rhythm', '/streaks', '/transactions',
  '/weekly', '/what-if', '/yearly', '/achievements', '/budget', '/matrix', '/import'];
pages.forEach(p => console.log(p));

// Check for cashflow page existence
const cashflow = db.prepare(`
  SELECT p.month, 
    SUM(CASE WHEN t.type = 'cash' THEN t.amount ELSE 0 END) as cash_out,
    SUM(CASE WHEN t.type = 'credit_expense' THEN t.amount ELSE 0 END) as credit_out,
    SUM(CASE WHEN t.type = 'credit_payment' THEN t.amount ELSE 0 END) as credit_pay,
    SUM(CASE WHEN t.type IN ('cash','credit_expense') THEN t.amount ELSE 0 END) as total_out
  FROM periods p
  LEFT JOIN transactions t ON t.period_id = p.id AND t.done = 1
  GROUP BY p.id
  ORDER BY p.start_date DESC
  LIMIT 6
`).all() as any[];
console.log('\n=== Cash Flow Last 6 Periods ===');
cashflow.forEach(p => console.log(`${p.month} | cash: ${p.cash_out} | credit: ${p.credit_out} | cc_pay: ${p.credit_pay} | total: ${p.total_out}`));

// Income vs spending
const incomeVsSpend = db.prepare(`
  SELECT p.month, mi.income, mi.other_income,
    SUM(CASE WHEN t.type IN ('cash','credit_expense') THEN t.amount ELSE 0 END) as spending
  FROM periods p
  LEFT JOIN monthly_income mi ON mi.period_id = p.id
  LEFT JOIN transactions t ON t.period_id = p.id AND t.done = 1
  GROUP BY p.id
  ORDER BY p.start_date DESC
  LIMIT 6
`).all() as any[];
console.log('\n=== Income vs Spending ===');
incomeVsSpend.forEach(p => {
  const totalIncome = (p.income || 0) + (p.other_income || 0);
  const surplus = totalIncome - (p.spending || 0);
  console.log(`${p.month} | income: ${p.income} | other: ${p.other_income} | spend: ${p.spending} | surplus: ${surplus}`);
});

// Top merchants
const topMerchants = db.prepare(`
  SELECT title, COUNT(*) as cnt, SUM(amount) as total
  FROM transactions
  WHERE done = 1 AND type IN ('cash','credit_expense')
  GROUP BY LOWER(TRIM(title))
  ORDER BY total DESC
  LIMIT 10
`).all() as any[];
console.log('\n=== Top 10 Spending Destinations ===');
topMerchants.forEach((m, i) => console.log(`${i+1}. ${m.title} | ${m.cnt}x | total: ${m.total}`));

// Net worth trend
const networth = db.prepare(`
  SELECT p.month, n.total
  FROM networth n
  JOIN periods p ON n.period_id = p.id
  ORDER BY p.start_date DESC
  LIMIT 6
`).all() as any[];
console.log('\n=== Net Worth Trend ===');
networth.forEach(n => console.log(`${n.month} | ${n.total}`));
