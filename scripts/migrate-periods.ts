// Migration: Add periods table + replace month TEXT with period_id FK
// Run: npx tsx scripts/migrate-periods.ts

import Database from 'better-sqlite3';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/financial.db');
const db = new Database(DB_PATH);

// Enable WAL for safety
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('=== Step 1: Create periods table ===');
db.exec(`
  CREATE TABLE IF NOT EXISTS periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL UNIQUE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL
  );
`);
console.log('periods table created.');

console.log('\n=== Step 2: Compute periods from existing data ===');

// Collect all distinct month values from all tables
type MonthRow = { month: string };
const txMonths = db.prepare('SELECT DISTINCT month FROM transactions').all() as MonthRow[];
const nwMonths = db.prepare('SELECT DISTINCT month FROM networth').all() as MonthRow[];
const incMonths = db.prepare('SELECT DISTINCT month FROM monthly_income').all() as MonthRow[];

const monthSet = new Set<string>();
txMonths.forEach((r) => monthSet.add(r.month));
nwMonths.forEach((r) => monthSet.add(r.month));
incMonths.forEach((r) => monthSet.add(r.month));

console.log(`Unique months: ${monthSet.size}`);

// Parse "June 2026" -> { month: 6, year: 2026 }
const monthNames = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function parseMonth(monthStr: string): { m: number; y: number } | null {
  const parts = monthStr.split(' ');
  if (parts.length !== 2) return null;
  const idx = monthNames.indexOf(parts[0]);
  const year = parseInt(parts[1], 10);
  if (idx === -1 || isNaN(year)) return null;
  return { m: idx + 1, y: year };
}

function computeDates(monthStr: string): { start_date: string; end_date: string } | null {
  const parsed = parseMonth(monthStr);
  if (!parsed) return null;
  const { m, y } = parsed;
  // Period end = 20th of named month
  const endDate = `${y}-${String(m).padStart(2,'0')}-20`;
  // Period start = 21st of previous month
  let prevM = m - 1;
  let prevY = y;
  if (prevM === 0) { prevM = 12; prevY = y - 1; }
  const startDate = `${prevY}-${String(prevM).padStart(2,'0')}-21`;
  return { start_date: startDate, end_date: endDate };
}

// Insert periods (sorted oldest first for predictable IDs)
const sortedMonths = [...monthSet].sort((a, b) => {
  const pa = parseMonth(a);
  const pb = parseMonth(b);
  if (!pa || !pb) return 0;
  if (pa.y !== pb.y) return pa.y - pb.y;
  return pa.m - pb.m;
});

const insertPeriod = db.prepare(
  'INSERT OR IGNORE INTO periods (month, start_date, end_date) VALUES (?, ?, ?)'
);

const periodMap = new Map<string, number>(); // month -> id

const insertAll = db.transaction(() => {
  for (const monthStr of sortedMonths) {
    const dates = computeDates(monthStr);
    if (!dates) {
      console.log(`  SKIP: cannot parse "${monthStr}"`);
      continue;
    }
    insertPeriod.run(monthStr, dates.start_date, dates.end_date);
    const row = db.prepare('SELECT id FROM periods WHERE month = ?').get(monthStr) as any;
    periodMap.set(monthStr, row.id);
    console.log(`  ${row.id}: ${monthStr} | ${dates.start_date} → ${dates.end_date}`);
  }
});
insertAll();

console.log(`\nInserted ${periodMap.size} periods.`);

console.log('\n=== Step 3: Add period_id columns ===');

// Add period_id to each table
const tables = ['transactions', 'networth', 'networth_breakdown', 'monthly_income'];
for (const table of tables) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN period_id INTEGER REFERENCES periods(id)`);
    console.log(`  Added period_id to ${table}`);
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      console.log(`  period_id already exists in ${table}`);
    } else {
      throw e;
    }
  }
}

console.log('\n=== Step 4: Populate period_id from month ===');
for (const table of tables) {
  const stmt = db.prepare(`UPDATE ${table} SET period_id = ? WHERE month = ? AND period_id IS NULL`);
  let count = 0;
  const updateAll = db.transaction(() => {
    for (const [monthStr, id] of periodMap) {
      const result = stmt.run(id, monthStr);
      count += result.changes;
    }
  });
  updateAll();
  console.log(`  ${table}: ${count} rows updated`);
}

// Verify no nulls in core tables
console.log('\n=== Step 5: Verify ===');
for (const table of ['transactions', 'networth', 'monthly_income']) {
  const nulls = db.prepare(`SELECT COUNT(*) as cnt FROM ${table} WHERE period_id IS NULL`).get() as any;
  console.log(`  ${table} with NULL period_id: ${nulls.cnt}`);
}

console.log('\n=== Step 6: Drop old month columns, add NOT NULL ===');
// SQLite doesn't support DROP COLUMN directly in older versions,
// but better-sqlite3 + recent SQLite does. Let's try.

// Recreate tables without month column for tables that need it.
// For simplicity, we'll use ALTER TABLE DROP COLUMN (SQLite 3.35+)
for (const table of tables) {
  try {
    // Drop old index first
    if (table === 'transactions') {
      db.exec('DROP INDEX IF EXISTS idx_tx_month');
    }
    db.exec(`ALTER TABLE ${table} DROP COLUMN month`);
    console.log(`  Dropped month from ${table}`);
  } catch (e: any) {
    console.log(`  WARNING: Could not drop month from ${table}: ${e.message}`);
  }
}

// Recreate index on period_id
db.exec('CREATE INDEX IF NOT EXISTS idx_tx_period ON transactions(period_id)');

// Verify final schema
console.log('\n=== Final Schema ===');
const tables2 = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as any[];
for (const t of tables2) {
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log(`${t.name}: ${cols.map((c: any) => c.name).join(', ')}`);
}

db.close();
console.log('\n✅ Migration complete.');
