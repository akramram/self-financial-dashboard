import { db, initSchema, upsertNetworth, insertTransaction, recalcNetworthMoM } from './src/lib/db.js';
import fs from 'fs';

initSchema();

const transactions = JSON.parse(fs.readFileSync('./src/data/transactions.json', 'utf-8'));
const networth = JSON.parse(fs.readFileSync('./src/data/networth.json', 'utf-8'));
const summaries = JSON.parse(fs.readFileSync('./src/data/monthly_summary.json', 'utf-8'));

// Migrate transactions
const txStmt = db.prepare(`
  INSERT INTO transactions (month, date, title, category, amount, currency, type, payment_method, done, created_time)
  VALUES (@month, @date, @title, @category, @amount, @currency, @type, @payment_method, @done, @created_time)
`);

const insertTx = db.transaction((items: any[]) => {
  for (const item of items) {
    txStmt.run({
      month: item.month,
      date: item.date,
      title: item.title,
      category: item.category,
      amount: item.amount,
      currency: item.currency || 'IDR',
      type: item.type,
      payment_method: item.payment_method,
      done: item.done ? 1 : 0,
      created_time: item.created_time || null,
    });
  }
});

insertTx(transactions);
console.log(`Migrated ${transactions.length} transactions`);

// Migrate networth
const insertNw = db.transaction((items: any[]) => {
  for (const item of items) {
    upsertNetworth({
      month: item.month,
      date: item.date,
      total: item.total,
      currency: item.currency || 'IDR',
      month_over_month_change: item.month_over_month_change,
      month_over_month_pct: item.month_over_month_pct,
      breakdown: item.breakdown,
    });
  }
});

insertNw(networth);
console.log(`Migrated ${networth.length} networth records`);

// Update income in summaries
const updateIncome = db.prepare('UPDATE transactions SET month = month WHERE month = ?'); // no-op to ensure table exists
// Actually we don't have a summaries table. Income is parsed from markdown and stored in a simple table.
// Let's create an income table.

db.exec(`
  CREATE TABLE IF NOT EXISTS monthly_income (
    month TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    income REAL NOT NULL DEFAULT 0,
    other_income REAL NOT NULL DEFAULT 0
  );
`);

const incomeStmt = db.prepare(`
  INSERT OR REPLACE INTO monthly_income (month, date, income)
  VALUES (@month, @date, @income)
`);

const insertIncome = db.transaction((items: any[]) => {
  for (const item of items) {
    incomeStmt.run({
      month: item.month,
      date: item.date,
      income: item.income,
    });
  }
});

insertIncome(summaries);
console.log(`Migrated ${summaries.length} monthly income records`);

recalcNetworthMoM();
console.log('Recalculated networth MoM');

console.log('Migration complete!');
